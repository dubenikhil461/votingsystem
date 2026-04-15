import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function headers(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestOtp(email, aadhaarNumber) {
  const { data } = await axios.post(`${API_BASE}/auth/request-otp`, { email, aadhaarNumber });
  return data;
}

export async function verifyOtp(email, otp, aadhaarNumber) {
  const { data } = await axios.post(`${API_BASE}/auth/verify-otp`, { email, otp, aadhaarNumber });
  return data;
}

export async function loginAdmin(username, password) {
  const { data } = await axios.post(`${API_BASE}/auth/admin/login`, { username, password });
  return data;
}

export async function walletNonce(token) {
  const { data } = await axios.get(`${API_BASE}/wallet/nonce`, { headers: headers(token) });
  return data;
}

export async function walletLink(token, address, signature) {
  const { data } = await axios.post(
    `${API_BASE}/wallet/link`,
    { address, signature },
    { headers: headers(token) }
  );
  return data;
}

export async function fetchStatus(token) {
  const { data } = await axios.get(`${API_BASE}/wallet/me/status`, { headers: headers(token) });
  return data.user;
}

export async function approveWallet(token, email) {
  const { data } = await axios.post(
    `${API_BASE}/admin/approve-wallet`,
    { email },
    { headers: headers(token) }
  );
  return data;
}
