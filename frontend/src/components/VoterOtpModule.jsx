function VoterOtpModule({
  email,
  setEmail,
  aadhaarNumber,
  setAadhaarNumber,
  otp,
  setOtp,
  loading,
  onRequestOtp,
  onVerifyOtp,
  onClearSession,
}) {
  return (
    <section className="card">
      <h2>Step 1: Voter Login + OTP</h2>
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
          onClick={onRequestOtp}
        >
          Request OTP
        </button>
      </div>
      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />
      <div className="row">
        <button
          disabled={loading || !email || !otp || aadhaarNumber.length !== 12}
          onClick={onVerifyOtp}
        >
          Verify OTP
        </button>
        <button className="secondary" onClick={onClearSession}>
          Clear Voter Session
        </button>
      </div>
      <p className="subtle">
        Wallet connect is enabled only after OTP verification succeeds.
      </p>
    </section>
  );
}

export default VoterOtpModule;
