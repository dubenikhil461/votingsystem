import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
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
    return async () => {
      setLoading(true);
      try {
        await fn();
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
    navigate("/admin/panel");
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
    navigate("/admin/login");
  }

  function Layout({ title, children }) {
    return (
      <main className="app">
        <header className="header">
          <div>
            <h1>{title}</h1>
            <p className="subtle">QuickVote - OTP + Wallet + Blockchain voting</p>
          </div>
          <nav className="nav">
            <Link to="/voter/login">Voter Login</Link>
            <Link to="/voter/vote">Voter Vote</Link>
            <Link to="/admin/login">Admin Login</Link>
            <Link to="/admin/panel">Admin Panel</Link>
          </nav>
        </header>
        {message && <p className="message">{message}</p>}
        {children}
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/voter/login" replace />} />

      <Route
        path="/voter/login"
        element={
          <Layout title="Voter Login">
            <section className="card">
              <h2>Step 1: Verify with OTP</h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Voter email"
                autoComplete="off"
              />
              <input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="Aadhaar number (12 digits)"
                autoComplete="off"
              />
              <div className="row">
                <button
                  disabled={loading || !email || aadhaarNumber.length !== 12}
                  onClick={withUiHandling(onRequestOtp)}
                >
                  Request OTP
                </button>
              </div>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
              <div className="row">
                <button
                  disabled={loading || !email || !otp || aadhaarNumber.length !== 12}
                  onClick={withUiHandling(onVerifyOtp)}
                >
                  Verify OTP
                </button>
                <button className="secondary" onClick={logoutUser}>Clear Voter Session</button>
              </div>
            </section>
            <section className="card">
              <h2>Step 2: Link Wallet</h2>
              {!userToken ? (
                <p className="subtle">Complete OTP verification first to enable MetaMask linking.</p>
              ) : (
                <>
                  <div className="row">
                    <button disabled={loading} onClick={withUiHandling(onConnectWallet)}>Connect MetaMask</button>
                    <button disabled={loading || !userToken} onClick={withUiHandling(onLinkWallet)}>
                      Link Wallet via Signed Nonce
                    </button>
                  </div>
                  <p>Connected wallet: {walletAddress || "Not connected"}</p>
                  <p>
                    Status:{" "}
                    {status
                      ? `${status.verified ? "Verified" : "Not verified"} / ${
                          status.approved ? "Approved" : "Not approved"
                        }`
                      : "No profile"}
                  </p>
                  {status?.voterId && <p>Voter ID: {status.voterId}</p>}
                  {status?.aadhaarLast4 && <p>Aadhaar: XXXX XXXX {status.aadhaarLast4}</p>}
                  <p className="subtle">After linking wallet, you will be redirected to Voter Vote page.</p>
                </>
              )}
            </section>
          </Layout>
        }
      />

      <Route
        path="/voter/vote"
        element={
          !userToken ? (
            <Navigate to="/voter/login" replace />
          ) : (
          <Layout title="Voter Voting Booth">
            <section className="card">
              <h2>Live Election</h2>
              <p>Election state: {ELECTION_LABELS[electionState] || "Unknown"}</p>
              <p>
                Wallet status:{" "}
                {status
                  ? `${status.verified ? "Verified" : "Not verified"} / ${
                      status.approved ? "Approved" : "Not approved"
                    }`
                  : "No profile"}
              </p>
            </section>
            <section className="card">
              <h2>Candidates</h2>
              <div className="candidates">
                {candidates.map((candidate, index) => (
                  <div className="candidate" key={`${candidate.name}-${index}`}>
                    <h3>{candidate.name}</h3>
                    <p>Votes: {candidate.voteCount.toString()}</p>
                    <button disabled={!canVote || loading} onClick={withUiHandling(() => onVote(index))}>
                      Vote
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </Layout>
          )
        }
      />

      <Route
        path="/admin/login"
        element={
          <Layout title="Admin Login">
            <section className="card">
              <h2>Admin Authentication</h2>
              <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="Admin username" />
              <input
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                type="password"
              />
              <div className="row">
                <button disabled={loading} onClick={withUiHandling(onAdminLogin)}>Login</button>
                <button className="secondary" onClick={logoutAdmin}>Clear Admin Session</button>
              </div>
            </section>
          </Layout>
        }
      />

      <Route
        path="/admin/panel"
        element={
          <Layout title="Admin Control Panel">
            <section className="card">
              <h2>Election Controls</h2>
              <p>Election state: {ELECTION_LABELS[electionState] || "Unknown"}</p>
              <div className="row">
                <button disabled={loading || !adminToken} onClick={withUiHandling(onStartElection)}>Start Election</button>
                <button disabled={loading || !adminToken} onClick={withUiHandling(onEndElection)}>End Election</button>
              </div>
              <p className="subtle">Use admin/deployer wallet in MetaMask for start/end actions.</p>
            </section>
            <section className="card">
              <h2>Approve Voters (Before Start)</h2>
              <input
                value={adminEmailToApprove}
                onChange={(e) => setAdminEmailToApprove(e.target.value)}
                placeholder="Voter email to approve"
              />
              <button
                disabled={loading || !adminToken || !adminEmailToApprove}
                onClick={withUiHandling(onApproveWallet)}
              >
                Approve + Whitelist Wallet
              </button>
            </section>
            <section className="card">
              <h2>Live Candidate Count</h2>
              <div className="candidates">
                {candidates.map((candidate, index) => (
                  <div className="candidate" key={`${candidate.name}-${index}`}>
                    <h3>{candidate.name}</h3>
                    <p>Votes: {candidate.voteCount.toString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
