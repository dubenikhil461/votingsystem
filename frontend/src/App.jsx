import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import {
  fetchStatus,
  loginAdmin,
  requestOtp,
  verifyOtp,
  walletNonce,
  walletLink,
  approveWallet,
} from "./services/api";
import {
  connectWallet,
  getCandidates,
  getElectionState,
  getSelectedAddress,
  getVotingContractWithSigner,
} from "./services/contract";
import PageLayout from "./components/PageLayout";
import VoterOtpModule from "./components/VoterOtpModule";
import WalletLinkModule from "./components/WalletLinkModule";
import VoterVoteModule from "./components/VoterVoteModule";
import AdminModule from "./components/AdminModule";
import Home from "./components/Home";

const ELECTION_LABELS = ["NotStarted", "Ongoing", "Ended"];
const STORAGE_KEYS = {
  USER_TOKEN: "quickvote_user_token",
  ADMIN_TOKEN: "quickvote_admin_token",
};

function App() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [userToken, setUserToken] = useState(localStorage.getItem(STORAGE_KEYS.USER_TOKEN) || "");
  const [adminToken, setAdminToken] = useState(localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || "");
  const [walletAddress, setWalletAddress] = useState("");
  const [status, setStatus] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [electionState, setElectionState] = useState(0);
  const [adminEmailToApprove, setAdminEmailToApprove] = useState("");
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const canVote = useMemo(() => {
    return !!status?.verified && !!status?.approved && electionState === 1;
  }, [status, electionState]);

  async function refreshChainData() {
    const [onChainCandidates, currentState] = await Promise.all([
      getCandidates(),
      getElectionState(),
    ]);
    setCandidates(onChainCandidates);
    setElectionState(Number(currentState));
  }

  async function refreshProfile(token) {
    const currentStatus = await fetchStatus(token);
    setStatus(currentStatus);
  }

  useEffect(() => {
    refreshChainData().catch((error) => setMessage(error.message));
    const timer = setInterval(() => {
      refreshChainData().catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userToken) {
      setStatus(null);
      return;
    }
    refreshProfile(userToken).catch((error) => setMessage(error.message));
  }, [userToken]);

  function mapErrorToMessage(error) {
    const apiMessage = error?.response?.data?.error;
    if (apiMessage) return apiMessage;

    const raw = [
      error?.shortMessage,
      error?.reason,
      error?.message,
      error?.info?.error?.message,
      error?.info?.payload?.method,
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();

    if (raw.includes("already voted")) {
      return "You have already voted with this wallet.";
    }
    if (raw.includes("not whitelisted")) {
      return "This wallet is not approved for the election.";
    }
    if (raw.includes("election is not ongoing")) {
      return "Voting is closed right now. Election must be ongoing.";
    }
    if (raw.includes("only admin")) {
      return "Only admin wallet can perform this action.";
    }
    if (raw.includes("election already started")) {
      return "Election already started. New voter approvals are blocked.";
    }
    if (raw.includes("invalid or expired otp")) {
      return "OTP is invalid or expired. Request a new OTP.";
    }
    if (raw.includes("user rejected") || raw.includes("action_rejected") || raw.includes("4001")) {
      return "Transaction/signature was cancelled in MetaMask.";
    }
    if (raw.includes("missing revert data") || raw.includes("call_exception")) {
      return "Transaction failed due to contract rule check. Verify wallet role and election state.";
    }
    return "Action failed. Please verify wallet, role, and election state.";
  }

  function withUiHandling(fn) {
    return async (...args) => {
      setLoading(true);
      try {
        await fn(...args);
      } catch (error) {
        setMessage(mapErrorToMessage(error));
      } finally {
        setLoading(false);
      }
    };
  }

  async function onRequestOtp() {
    const data = await requestOtp(email, aadhaarNumber);
    setMessage(data.devOtp ? `OTP sent. Dev OTP: ${data.devOtp}` : "OTP sent to email");
  }

  async function onVerifyOtp() {
    const data = await verifyOtp(email, otp, aadhaarNumber);
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.token);
    setUserToken(data.token);
    await refreshProfile(data.token);
    setMessage("OTP verification complete. Now connect and link MetaMask wallet.");
  }

  async function onConnectWallet() {
    const address = await connectWallet();
    setWalletAddress(address);
    setMessage(`Wallet connected: ${address}`);
  }

  async function onLinkWallet() {
    const selected = walletAddress || getSelectedAddress();
    if (!selected) {
      throw new Error("Connect wallet first");
    }
    const nonceData = await walletNonce(userToken);
    const signerContract = await getVotingContractWithSigner();
    const signature = await signerContract.runner.signMessage(nonceData.nonce);
    await walletLink(userToken, selected, signature);
    await refreshProfile(userToken);
    setMessage("Wallet linked successfully");
    navigate("/voter/vote");
  }

  async function onAdminLogin() {
    const data = await loginAdmin(adminUsername, adminPassword);
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
    setAdminToken(data.token);
    setMessage("Admin logged in");
    navigate("/admin");
  }

  async function onApproveWallet() {
    const data = await approveWallet(adminToken, adminEmailToApprove);
    setMessage(`Wallet approved and whitelisted. Tx: ${data.txHash}`);
    await refreshProfile(userToken);
  }

  async function onStartElection() {
    const contract = await getVotingContractWithSigner();
    const tx = await contract.startElection();
    await tx.wait();
    await refreshChainData();
    setMessage("Election started");
  }

  async function onEndElection() {
    const contract = await getVotingContractWithSigner();
    const tx = await contract.endElection();
    await tx.wait();
    await refreshChainData();
    setMessage("Election ended");
  }

  async function onVote(index) {
    const contract = await getVotingContractWithSigner();
    const tx = await contract.vote(index);
    await tx.wait();
    await refreshChainData();
    setMessage("Vote submitted");
  }

  function logoutUser() {
    localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    setUserToken("");
    setStatus(null);
    setMessage("Voter session cleared");
    navigate("/voter/login");
  }

  function logoutAdmin() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setAdminToken("");
    setMessage("Admin logged out");
    navigate("/admin");
  }

  const electionLabel = ELECTION_LABELS[electionState] || "Unknown";
  const hasWalletLinked = !!status?.walletAddress;
  const voterReadyForVote = !!userToken && hasWalletLinked;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/voter/login" replace />} />
      <Route path="/home" element={<Home />} />

      <Route
        path="/voter/login"
        element={
          <PageLayout title="Voter Onboarding" message={message}>
            {!userToken ? (
              <VoterOtpModule
                email={email}
                setEmail={setEmail}
                aadhaarNumber={aadhaarNumber}
                setAadhaarNumber={setAadhaarNumber}
                otp={otp}
                setOtp={setOtp}
                loading={loading}
                onRequestOtp={withUiHandling(onRequestOtp)}
                onVerifyOtp={withUiHandling(onVerifyOtp)}
                onClearSession={logoutUser}
              />
            ) : hasWalletLinked ? (
              <Navigate to="/voter/vote" replace />
            ) : (
              <WalletLinkModule
                loading={loading}
                onConnectWallet={withUiHandling(onConnectWallet)}
                onLinkWallet={withUiHandling(onLinkWallet)}
                walletAddress={walletAddress}
                status={status}
              />
            )}
          </PageLayout>
        }
      />

      <Route
        path="/voter/vote"
        element={
          !voterReadyForVote ? (
            <Navigate to="/voter/login" replace />
          ) : (
            <PageLayout title="Voter Voting Booth" message={message}>
              <VoterVoteModule
                electionLabel={electionLabel}
                status={status}
                candidates={candidates}
                canVote={canVote}
                loading={loading}
                onVote={withUiHandling((index) => onVote(index))}
              />
            </PageLayout>
          )
        }
      />

      <Route
        path="/admin"
        element={
          <PageLayout title="Admin Module" message={message}>
            <AdminModule
              isLoggedIn={!!adminToken}
              loading={loading}
              adminUsername={adminUsername}
              setAdminUsername={setAdminUsername}
              adminPassword={adminPassword}
              setAdminPassword={setAdminPassword}
              onAdminLogin={withUiHandling(onAdminLogin)}
              onAdminLogout={logoutAdmin}
              electionLabel={electionLabel}
              onStartElection={withUiHandling(onStartElection)}
              onEndElection={withUiHandling(onEndElection)}
              adminEmailToApprove={adminEmailToApprove}
              setAdminEmailToApprove={setAdminEmailToApprove}
              onApproveWallet={withUiHandling(onApproveWallet)}
              candidates={candidates}
            />
          </PageLayout>
        }
      />
      <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/panel" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
