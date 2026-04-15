import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="app">
      <section className="card hero-card">
        <p className="badge">Secure Digital Democracy</p>
        <h1>QuickVote Voting System</h1>
        <p className="subtle">
          Aadhaar-backed verification, wallet-based authentication, one-vote-per-wallet protection,
          and transparent live counting for BJP, Congress, and AAP.
        </p>
        <div className="row">
          <Link className="home-link" to="/voter/login">
            Voter Login
          </Link>
          <Link className="home-link" to="/admin">
            Admin Panel
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>How It Works</h2>
        <div className="candidates">
          <article className="candidate">
            <h3>1) Verify Identity</h3>
            <p>Email + Aadhaar + OTP verification creates trusted voter profile.</p>
          </article>
          <article className="candidate">
            <h3>2) Link Wallet</h3>
            <p>Wallet signature binds voter identity to one blockchain address.</p>
          </article>
          <article className="candidate">
            <h3>3) Cast Vote</h3>
            <p>Vote is recorded on-chain and counted transparently in real time.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
