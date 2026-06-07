# BrewPoints API — endpoint reference (for Postman testing)

Base URL (dev): `http://localhost:3001`. All bodies are JSON. Authenticated routes need
`Authorization: Bearer <token>` (token comes from a login/register response).

## Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, phone?, password }` → customer (CRUD: **Create**) |
| POST | `/api/auth/login` | — | `{ email, password }` |
| POST | `/api/auth/staff/login` | — | `{ email, password }` |
| GET  | `/api/auth/google` | — | OAuth redirect |

## Customer account & loyalty (feature 1 — full CRUD)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET    | `/api/me` | customer | profile + balance (CRUD: **Read**) |
| PATCH  | `/api/me` | customer | `{ name?, phone? }` (CRUD: **Update**) |
| DELETE | `/api/me` | customer | delete account + all data (CRUD: **Delete**) |
| GET    | `/api/me/transactions` | customer | stamp history (Read) |
| GET    | `/api/me/redemptions` | customer | redemption history (Read) |

Loyalty stamp ledger is **append-only by design (R2)** — the `StampTransaction` table is the
immutable source of truth, so stamps are Created (earn) and Read (history) but never edited or
deleted. This is intentional for audit integrity, not a missing CRUD operation.

## Staff (stamping & redemption)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/staff/scan` | staff | `{ membershipId, intent, signature }` |
| POST | `/api/staff/earn` | staff | `{ membershipId, stamps, idempotencyKey? }` (CRUD: **Create** stamp) |
| POST | `/api/staff/redeem` | staff | `{ membershipId }` (the only stamp-deduction point, R1) |

## Manager → staff management (feature 2 — full CRUD)
| Method | Path | Auth | Body |
|---|---|---|---|
| GET    | `/api/manager/overview` | manager | store overview |
| GET    | `/api/manager/staff` | manager | list staff (CRUD: **Read**) |
| POST   | `/api/manager/staff` | manager | `{ name, email, role, password }` (CRUD: **Create**) |
| PATCH  | `/api/manager/staff/:staffId` | manager | `{ name?, role?, password? }` (CRUD: **Update**) |
| DELETE | `/api/manager/staff/:staffId` | manager | (CRUD: **Delete**; can't delete self or the last manager) |

## Push (Task 05) — see PUSH.md
| Method | Path | Auth |
|---|---|---|
| GET  | `/api/push/public-key` | — |
| POST | `/api/me/push/subscribe` | customer |
| POST | `/api/me/push/unsubscribe` | customer |
| POST | `/api/me/push/test` | customer |
