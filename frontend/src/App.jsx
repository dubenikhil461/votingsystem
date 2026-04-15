import { useEffect, useMemo, useState } from "react";
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

function App() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userToken, setUserToken] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [status, setStatus] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [electionState, setElectionState] = useState(0);
  const [adminEmailToApprove, setAdminEmailToApprove] = useState("");
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [message, setMessage] = useState("");

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
    refreshChainData().catch(() => {});
    const timer = setInterval(() => {
      refreshChainData().catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  async function onRequestOtp() {
    const data = await requestOtp(email);
    setMessage(data.devOtp ? `OTP sent. Dev OTP: ${data.devOtp}` : "OTP sent to email");
  }

  async function onVerifyOtp() {
    const data = await verifyOtp(email, otp);
    setUserToken(data.token);
    await refreshProfile(data.token);
    setMessage("Verification complete");
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
  }

  async function onAdminLogin() {
    const data = await loginAdmin(adminUsername, adminPassword);
    setAdminToken(data.token);
    setMessage("Admin logged in");
  }

  async function onApproveWallet() {
    const data = await approveWallet(adminToken, adminEmailToApprove);
    setMessage(`Wallet approved and whitelisted. Tx: ${data.txHash}`);
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

  return (
    <main className="app">
      <h1>QuickVote DApp</h1>
      <p className="message">{message}</p>

      <section className="card">
        <h2>1) Verify User (OTP)</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <button onClick={onRequestOtp}>Request OTP</button>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
        <button onClick={onVerifyOtp}>Verify OTP</button>
      </section>

      <section className="card">
        <h2>2) Link Wallet</h2>
        <button onClick={onConnectWallet}>Connect MetaMask</button>
        <button onClick={onLinkWallet} disabled={!userToken}>
          Link Wallet via Signed Nonce
        </button>
        <p>Connected wallet: {walletAddress || "Not connected"}</p>
        <p>
          Status: {status ? `${status.verified ? "Verified" : "Not verified"} / ${status.approved ? "Approved" : "Not approved"}` : "No profile"}
        </p>
      </section>

      <section className="card">
        <h2>3) Admin</h2>
        <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="Admin username" />
        <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" type="password" />
        <button onClick={onAdminLogin}>Admin Login</button>
        <input
          value={adminEmailToApprove}
          onChange={(e) => setAdminEmailToApprove(e.target.value)}
          placeholder="User email to approve"
        />
        <button onClick={onApproveWallet} disabled={!adminToken}>
          Approve + Whitelist Wallet
        </button>
        <div className="row">
          <button onClick={onStartElection}>Start Election</button>
          <button onClick={onEndElection}>End Election</button>
        </div>
      </section>

      <section className="card">
        <h2>4) Vote + Live Candidate Counts</h2>
        <p>Election state: {["NotStarted", "Ongoing", "Ended"][electionState] || "Unknown"}</p>
        <div className="candidates">
          {candidates.map((candidate, index) => (
            <div className="candidate" key={`${candidate.name}-${index}`}>
              <h3>{candidate.name}</h3>
              <p>Votes: {candidate.voteCount.toString()}</p>
              <button onClick={() => onVote(index)} disabled={!canVote}>
                Vote
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
