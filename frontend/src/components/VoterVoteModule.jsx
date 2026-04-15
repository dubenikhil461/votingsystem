function VoterVoteModule({
  electionLabel,
  status,
  candidates,
  canVote,
  loading,
  onVote,
}) {
  return (
    <>
      <section className="card">
        <h2>Live Election</h2>
        <p>Election state: {electionLabel}</p>
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
              <button disabled={!canVote || loading} onClick={() => onVote(index)}>
                Vote
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default VoterVoteModule;
