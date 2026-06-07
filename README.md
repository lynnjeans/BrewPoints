# BrewPoints

Digital coffee loyalty PWA for an independent café. Customers show a dynamic QR on their phone,
staff scan it to add stamps, and a full card (10 stamps) redeems one free coffee.

This is the implementation. The **authoritative spec is
[`design/BrewPoints_Dev_Plan.md`](./design/BrewPoints_Dev_Plan.md)**; current progress is tracked in
[`design/PROJECT_STATUS.md`](./design/PROJECT_STATUS.md).

## The three business red lines (R1 / R2 / R3)

Every stamp-related change must hold these:

- **R1** — Deduction happens **only at the staff-confirm step**. The client never deducts.
- **R2** — `StampTransaction` is the source of truth. Deduction uses an atomic conditional update
  (`UPDATE ... WHERE balance >= 10`), writing the transaction + redemption in one DB transaction.
- **R3** — The QR is a long-lived client-side HMAC signature; the server verify + balance check is
  the only gate. **No** time window, no replay protection, no used-token table; forwarding is allowed.

## Monorepo layout

| Package    | Stack                                          | Dev port |
| ---------- | ---------------------------------------------- | -------- |
| `/client`  | Vite + React 19 + TypeScript + Tailwind v3 (PWA) | 5173     |
| `/server`  | Express 4 + TypeScript (Mongoose + MongoDB)      | 3001     |
| `/design`  | Authoritative spec, design tokens, status doc    | —        |

```
client/src/
  pages/      customer screens: login / coffee card / rewards / history / profile / OAuth callback
  staff/      staff screens: login / scan / manager overview + auth context
  components/ AppShell, BottomNav, KoruRing, InstallButton, …
  qr/         client-side HMAC signing + member-code component (R3)
  pwa/        beforeinstallprompt capture + install hook
  auth/ session/  customer auth context + IndexedDB session storage
  lib/        api wrapper, online-status hook
server/src/
  auth/       register/login, JWT, Google OAuth, middleware, validation
  loyalty/    earn / redeem (deduct) / balance reconcile / history  (R1/R2)
  qr/         server-side signature verify (R3)
  customer/ staff/ manager/   per-role routes
server/scripts/ seed.ts, e2e-smoke.ts, generate-vapid.ts
server/test/   Mongoose-backed unit tests (in-memory replica set)
```

The design system is wired in via `client/tailwind.config.cjs`
(`presets: [require('../design/tailwind.config.js')]`). All UI must reference `bp-*` tokens —
never hardcode brand color hex.

## Getting started

> **Windows note:** install deps inside each package (`install:all` handles this with `cd`, not
> `npm --prefix`, which has a self-reference bug here). Avoid writing source files with PowerShell
> `Set-Content -Encoding utf8` — the BOM breaks tsx.

```bash
# 1. Install dependencies for root + both packages
npm run install:all

# 2. Configure the backend env (server/.env): JWT_SECRET (required),
#    MONGODB_URI (required — needs a replica set, see server/DB_SETUP.md),
#    optional Google OAuth creds + VAPID keys for push.

# 3. Start MongoDB (replica set) and seed dev data — see server/DB_SETUP.md
cd server
npm run seed
cd ..
```

## Run commands (dev / preview / production)

Prerequisite for all modes: MongoDB running (replica set — see `server/DB_SETUP.md`) and
`server/.env` configured. Run `npm run seed` once to load demo data.

### 1. Development (hot reload, HMR — daily coding)

```bash
npm run dev            # ⭐ client + server together (client proxies /api → server)

# or run each individually:
npm run dev:client     # http://localhost:5173   Vite dev — HMR, NO service worker
npm run dev:server     # http://localhost:3001   tsx watch — auto-restart on change
```

- Frontend: http://localhost:5173 · Backend: http://localhost:3001
- **No service worker in dev** (it would fight HMR's caching), so PWA install / offline / push
  do **not** work here — use Preview mode for those.
- Health check: `curl http://localhost:3001/api/health` → `{ "status": "ok" }`

### 2. Preview (PWA test mode — service worker ON)

Use this to test installability, offline caching, and push notifications (anything needing the SW).

```bash
# Terminal 1 — backend (built or dev, either works):
npm run dev:server                  # http://localhost:3001

# Terminal 2 — built client served by Vite preview:
cd client && npm run preview:pwa    # build + vite preview → http://localhost:4173
```

- Open http://localhost:4173 — this build **has the service worker** (Workbox), so install/offline/push work.
- No HMR here (it's a production build). Rebuild to see code changes.
- The install prompt needs localhost or HTTPS; a phone on plain-http LAN won't fire `beforeinstallprompt`
  (use an HTTPS tunnel for on-device testing).

### 3. Production (build + serve)

```bash
npm run build          # builds client (client/dist) AND compiles server (server/dist)

# Run the backend in production:
cd server && NODE_ENV=production npm start    # node dist/index.js → http://localhost:3001
```

- `server/dist` is the compiled API; run it with real env vars (`MONGODB_URI` pointing at Atlas,
  a strong `JWT_SECRET`, VAPID keys, Google OAuth creds).
- `client/dist` is static files — serve them with any static host / CDN (or `cd client && npm run preview`).
  Integrated hosting (Express serving `client/dist`) is not wired up yet (see PROJECT_STATUS backlog).

> Windows / PowerShell note: `NODE_ENV=production npm start` is bash syntax. In PowerShell use:
> `$env:NODE_ENV='production'; npm start`.

### Tests

```bash
cd server && npm test          # backend unit tests (Vitest)
cd client && npm test          # frontend unit tests (Vitest)
cd server && npm run smoke     # E2E smoke over real HTTP (server must be running on :3001)
```

## Dev accounts (from the seed)

| Role             | Email                   | Password   | Notes                              |
| ---------------- | ----------------------- | ---------- | ---------------------------------- |
| Staff (barista)  | `sam@brewpoints.local`  | `barista6` | Sign in at **`/staff/login`**      |
| Manager          | `morgan@brewpoints.local` | `manager6` | Can view the manager overview      |
| Customer · Ana   | `ana@example.co.nz`     | `coffee6`  | In progress (6/10), has a phone    |
| Customer · Cara  | `cara@example.co.nz`    | `coffee6`  | Reward ready (10/10)               |
| Customer · Ben   | `ben@example.co.nz`     | —          | Google sign-in (no password), 10/10 |

Customers and staff have separate login entry points (with cross-links between them).

## Root scripts

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Run client and server concurrently            |
| `npm run build`      | Build both packages                           |
| `npm run lint`       | ESLint across both packages                   |
| `npm run typecheck`  | TypeScript (strict) typecheck across both     |
| `npm run format`     | Prettier write                                |
| `npm run install:all`| Install root + client + server deps           |

## Design discipline (Appendix D)

- Colors come from tokens only — **never hardcode brand hex**. `bp-clay` is reserved for the 6
  scenarios listed in Appendix D.1.
- `bp-num` (Georgia italic) is for stamp numbers / dates / +1 / −10 only; everything else is Inter.
- No box-shadow (card depth = 1px stroke + inner divider). No Title Case copy.

## Deployment

Not yet wired. Planned: Express serves the client build (single service) + SPA fallback +
Dockerfile, deployed to DigitalOcean. See the "待办 / Backlog" section of the status doc.
