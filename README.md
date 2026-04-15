# QuickVote MVP (Ganache + React + Solidity + Node OTP)

This repository contains a 3-part voting system:

- `contract` - Solidity smart contract + Hardhat deployment
- `backend` - Express API with OTP verification and wallet approval
- `frontend` - React app for verify, link wallet, approve, vote, and live vote counts

## 1) Prerequisites

- Node.js (LTS recommended)
- Ganache running locally
- MetaMask browser extension
- Gmail SMTP app password (or any SMTP provider)

## 2) Start Ganache + MetaMask

1. Start Ganache on `http://127.0.0.1:7545`.
2. Copy one funded account private key from Ganache.
3. In MetaMask, add network:
   - RPC URL: `http://127.0.0.1:7545`
   - Chain ID: from Ganache UI (commonly `1337`)
4. Import funded accounts into MetaMask as needed.

## 3) Deploy Smart Contract

```bash
cd contract
cp .env.example .env
```

Set values in `contract/.env`:

- `RPC_URL`
- `ADMIN_PRIVATE_KEY`
- `CANDIDATES` (comma-separated)

Then run:

```bash
npm install
npm run compile
npm run deploy:ganache
```

Copy the deployed contract address from terminal output.

## 4) Configure Backend

```bash
cd backend
cp .env.example .env
npm install
```

Set `backend/.env`:

- `JWT_SECRET`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- SMTP values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- `RPC_URL`
- `ADMIN_PRIVATE_KEY`
- `CONTRACT_ADDRESS` (from deploy step)

Start backend:

```bash
npm run dev
```

## 5) Configure Frontend

```bash
cd frontend
cp .env.example .env
npm install
```

Set `frontend/.env`:

- `VITE_API_BASE_URL=http://localhost:4000`
- `VITE_CONTRACT_ADDRESS=<deployed contract address>`

Start frontend:

```bash
npm run dev
```

## 6) Demo Flow

1. Enter email and request OTP.
2. Use email OTP (or dev OTP printed in backend console if SMTP missing).
3. Verify OTP.
4. Connect MetaMask wallet and link wallet via signed nonce.
5. Admin login with backend admin credentials.
6. Approve user email (backend whitelists wallet on chain).
7. Start election and cast vote.
8. Candidate vote counts update in UI.

## 7) Important Notes

- Smart contract enforces one vote per whitelisted wallet.
- Backend only handles identity verification and approval workflow.
- Vote counts are read directly from contract (`getAllCandidates`).
