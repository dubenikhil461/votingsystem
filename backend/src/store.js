const store = {
  usersByEmail: new Map(),
  usersByWallet: new Map(),
  usersByIdentityHash: new Map(),
  sessions: new Map(),
};

function getUserByEmail(email) {
  return store.usersByEmail.get(email.toLowerCase()) || null;
}

function upsertUser(email, patch) {
  const key = email.toLowerCase();
  const existing = store.usersByEmail.get(key) || {
    email: key,
    voterId: null,
    identityHash: null,
    aadhaarLast4: null,
    verified: false,
    otp: null,
    otpExpiresAt: null,
    walletAddress: null,
    walletNonce: null,
    approved: false,
  };
  const next = { ...existing, ...patch };
  store.usersByEmail.set(key, next);
  if (next.walletAddress) {
    store.usersByWallet.set(next.walletAddress.toLowerCase(), key);
  }
  if (next.identityHash) {
    store.usersByIdentityHash.set(next.identityHash, key);
  }
  return next;
}

function getUserByWallet(walletAddress) {
  const email = store.usersByWallet.get(walletAddress.toLowerCase());
  if (!email) return null;
  return getUserByEmail(email);
}

module.exports = {
  store,
  getUserByEmail,
  upsertUser,
  getUserByWallet,
};
