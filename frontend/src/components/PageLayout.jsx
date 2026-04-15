import { Link } from "react-router-dom";

function PageLayout({ title, message, children }) {
  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>{title}</h1>
          <p className="subtle">QuickVote - OTP + Wallet + Blockchain voting</p>
        </div>
      </header>
      {message && <p className="message">{message}</p>}
      {children}
    </main>
  );
}

export default PageLayout;
