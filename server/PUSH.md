# Web Push (secure messaging) — Task 05

BrewPoints sends encrypted push notifications when a customer earns a stamp or redeems a reward.

## How it's secured

- **VAPID key pair** identifies our server to the push service. Keys are generated with
  `npm run vapid:generate` and stored **only in `server/.env`** (gitignored) — never in code.
- The `web-push` library **encrypts each payload** with the subscription's own ECDH P-256 keys
  (`p256dh` + `auth`, per the Web Push / RFC 8291 spec), so the push service relays but cannot read it.
- The subscribe/unsubscribe/test endpoints are **authenticated** (customer JWT); a customer can only
  manage their own subscriptions.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/push/public-key` | none | VAPID public key + whether push is configured |
| POST | `/api/me/push/subscribe` | customer | Save a browser PushSubscription |
| POST | `/api/me/push/unsubscribe` | customer | Remove a subscription (`{ endpoint }`) |
| POST | `/api/me/push/test` | customer | Send a test notification to the caller's devices |

Notifications are also sent automatically from `POST /api/staff/earn` and `POST /api/staff/redeem`.

## Testing with Postman

1. `npm run vapid:generate` → paste keys into `server/.env` → restart the server.
2. `GET http://localhost:3001/api/push/public-key` → expect `{ "publicKey": "...", "enabled": true }`.
3. Log in as a customer (`POST /api/auth/login`) → copy the `token`.
4. In the built PWA (the browser actually creates the subscription), open Profile → **Notifications →
   Turn on**. This calls `POST /api/me/push/subscribe`.
5. `POST /api/me/push/test` with header `Authorization: Bearer <customer token>` → a notification
   appears on the device, and Postman returns `{ "ok": true }`.
6. Earn/redeem from the staff screen → the customer receives a live notification.

> Push requires the **built** PWA (`npm run preview:pwa`) — the dev server ships no service worker.
> On a phone it must be served over HTTPS (or localhost).
