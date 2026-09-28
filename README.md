# ไข่เจียว TonyStark 001 — Pre-order system

| Page | URL | Who |
|---|---|---|
| Landing + menu | `/` | everyone |
| Ordering | `/customer/` | customers (self sign-up with username/password) |
| Kitchen | `/kitchen/` | staff & admin accounts |

**Stack:** Vite + React + Tailwind (frontend) · Netlify Functions (`netlify/functions/api`) · Netlify Database (Postgres, free, auto-provisioned; schema in `netlify/database/migrations`).

## First deploy
1. Deploy to Netlify (build: `npm run build`, publish: `dist`). The database and migrations are set up automatically.
2. Open `https://<your-site>/kitchen/` **right away** — the first visitor creates the owner (admin) account.
3. In the kitchen → ตั้งค่า, add your PromptPay number (optional); → พนักงาน, add staff accounts.

## Local development
```bash
npm install
npm run db:migrate:local   # once, and after adding migrations (dev server must be stopped)
npm run dev                # http://localhost:5173
```
Local test logins are in `scripts/local-test-accounts.json` (local database only).

The original single-file Apps Script page is kept in `legacy/original.html`.
