# BrewPoints — architecture overview

```mermaid
flowchart LR
    subgraph Client["Client — React + Vite PWA"]
        UI[React UI<br/>customer + staff screens]
        SW[Service Worker<br/>Workbox cache + push handler]
        IDB[(IndexedDB<br/>session + qrSeed)]
        UI --- SW
        UI --- IDB
    end

    subgraph Server["Server — Express + TypeScript"]
        direction TB
        MW[Middleware<br/>pino-http, auth JWT, role guards, error handler]
        Routes[Routes<br/>auth / staff / customer / manager / push]
        Services[Services<br/>loyalty, auth, qr verify, staff-admin, push]
        Models[Mongoose models]
        MW --> Routes --> Services --> Models
    end

    DB[(MongoDB Atlas<br/>3-node replica set)]
    Google[Google OAuth 2.0]
    Push[Browser Push Service<br/>VAPID / Web Push]

    UI -->|HTTPS /api| MW
    Models --> DB
    Routes -->|OAuth code flow| Google
    Services -->|encrypted payloads| Push
    Push -. notifications .-> SW
```

## Design patterns applied (rubric: design patterns & code quality)
- **Layered architecture** — routes (HTTP) → services (business logic) → models (data). Keeps the
  loyalty rules testable in isolation and swappable behind stable function signatures.
- **Repository/Data-Mapper** — Mongoose models encapsulate persistence; services never build queries
  inline beyond their own concern.
- **Middleware (chain of responsibility)** — `pino-http`, `authenticate`, `requireRole`,
  `requireManager`, central error handler compose per route.
- **Strategy via `intent`** — one QR component + one scan endpoint route to earn vs redeem flows by
  the signed `intent` field (no server-side request state).
- **Singleton** — single Mongoose connection and single logger instance shared process-wide.
- **Fail-fast configuration** — typed config validated at startup (`config.ts`).
