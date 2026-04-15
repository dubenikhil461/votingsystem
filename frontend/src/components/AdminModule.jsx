function AdminModule({
  isLoggedIn,
  loading,
  adminUsername,
  setAdminUsername,
  adminPassword,
  setAdminPassword,
  onAdminLogin,
  onAdminLogout,
  electionLabel,
  onStartElection,
  onEndElection,
  adminEmailToApprove,
  setAdminEmailToApprove,
  onApproveWallet,
  candidates,
}) {
  if (!isLoggedIn) {
    return (
      <section className="card">
        <h2>Admin Login</h2>
        <input
          value={adminUsername}
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="Admin username"
        />
        <input
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Admin password"
          type="password"
        />
        <button disabled={loading} onClick={onAdminLogin}>
          Login
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h2>Election Controls</h2>
        <p>Election state: {electionLabel}</p>
        <div className="row">
          <button disabled={loading} onClick={onStartElection}>
            Start Election
          </button>
          <button disabled={loading} onClick={onEndElection}>
            End Election
          </button>
          <button className="secondary" onClick={onAdminLogout}>
            Logout Admin
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Approve Voters (Before Start)</h2>
        <input
          value={adminEmailToApprove}
          onChange={(e) => setAdminEmailToApprove(e.target.value)}
          placeholder="Voter email to approve"
        />
        <button
          disabled={loading || !adminEmailToApprove}
          onClick={onApproveWallet}
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
    </>
  );
}

export default AdminModule;
