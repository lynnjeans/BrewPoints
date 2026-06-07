# BrewPoints — Personas

## Persona 1 — Sophie (primary: the customer)

|  |  |
|---|---|
| **Age / role** | 28, UX designer in central Auckland |
| **Tech** | iPhone, lives in her browser, installs PWAs to her home screen, often on the move |
| **Coffee habit** | 1–2 flat whites a day from the café near her office |
| **Goals** | Collect stamps without carrying a paper card; know how close she is to a free coffee; let her partner grab her free coffee sometimes |
| **Frustrations** | Loses paper loyalty cards; hates apps that nag for sign-up details; patchy reception inside the café basement |
| **Needs from BrewPoints** | Show her member QR instantly **even offline**; clear progress to the next reward; optional phone number; a gentle nudge when a reward is ready |
| **How the product serves her** | Offline-capable member QR (local HMAC), Koru progress ring, "Phone is optional" copy, Web Push when she earns/redeems, transferable redeem code for her partner |

## Persona 2 — Sam (secondary: the barista / staff)

|  |  |
|---|---|
| **Age / role** | 22, barista, works the morning rush |
| **Tech** | Café tablet, busy hands, needs two taps max |
| **Goals** | Add stamps fast; redeem a reward with zero ambiguity; never accidentally over-credit |
| **Frustrations** | Slow apps during a queue; unclear whether a code is "earn" or "redeem" |
| **Needs from BrewPoints** | Scan → instantly see customer + whether they want a stamp or a reward; one clear Confirm button; protection against double-tap |
| **How the product serves her** | One scan endpoint that routes by `intent`; big +1/+2 buttons; redemption confirmation with a clear clay banner; idempotent earn |

## Persona 3 — Morgan (tertiary: the café manager / owner)

|  |  |
|---|---|
| **Age / role** | 41, café owner |
| **Goals** | See loyalty activity at a glance; manage which staff have access |
| **Needs** | Read-only store overview (customers, stamps, redemptions); add/edit/remove staff accounts |
| **How the product serves her** | Manager overview screen + full staff-management CRUD, manager-only and guarded so the last manager can't be removed |
