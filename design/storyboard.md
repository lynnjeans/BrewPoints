# BrewPoints — Storyboard

A six-frame storyboard following Sophie (customer) and Sam (barista) through the core loop.
Use these frames as the basis for the Figma hi-fi wireframes.

| # | Frame | What's happening | Screen / state |
|---|---|---|---|
| 1 | **Sign up** | Sophie opens BrewPoints, taps "Continue with Google" (or email). Phone is optional. | Login screen (D.7.1) |
| 2 | **The card** | She lands on her digital coffee card: "Morning, Sophie." with a Koru ring at 6/10 and her member QR shown — works even with no signal. | Coffee card, in-progress (D.7.3) |
| 3 | **Earn** | At the counter she shows the QR. Sam scans it, taps **+1 Stamp**. Sophie's phone buzzes: "+1 stamp added · 3 to go." | Staff earn screen (D.7.9) + push |
| 4 | **Reward ready** | A few visits later the card flips to inverted ink with all beans lit and a clay **Redeem** button: "Your shout's on us." | Coffee card, reward-ready (D.7.4) |
| 5 | **Redeem** | Sophie taps Redeem (the QR switches to a redeem code, offline). Sam scans it, sees the clay "Redemption request" banner, taps **Confirm Redemption**. | Staff redeem confirm (D.7.10) |
| 6 | **Cheers** | Balance resets to 0/10, a "Cheers — coffee's on the house" confirmation shows, and Sophie gets a push. Sam hands over the coffee. | Redeem success (D.7.16) + push |

## Alternate / edge frames (optional in Figma)
- **Offline**: black "You're offline · your QR still works" banner; card still renders from cache.
- **Not enough stamps**: staff scans a redeem code under 10 — calm beige "X more stamps needed", no red.
- **Forwarded code**: Sophie screenshots her redeem code to her partner; it still verifies (transfer allowed by design).
- **Manager**: Morgan opens the overview, adds a new barista in the Staff section.
