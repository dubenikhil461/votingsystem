function WalletLinkModule({
  loading,
  onConnectWallet,
  onLinkWallet,
  walletAddress,
  status,
}) {
  return (
    <section className="card">
      <h2>Step 2: Connect and Link MetaMask</h2>
      <div className="row">
        <button disabled={loading} onClick={onConnectWallet}>
          Connect MetaMask
        </button>
        <button disabled={loading} onClick={onLinkWallet}>
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
      <p className="subtle">
        After wallet linking, you will be redirected to the voter vote page.
      </p>
    </section>
  );
}

export default WalletLinkModule;
