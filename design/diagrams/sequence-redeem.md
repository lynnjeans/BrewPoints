# Sequence — redeem a free coffee (one-stage, R1/R2)

The only place stamps are deducted (R1: staff confirmation). The deduction + Redeem transaction +
Redemption record commit in one MongoDB transaction with an atomic conditional update (R2), so
concurrent confirms can never drive the balance negative.

```mermaid
sequenceDiagram
    actor Customer
    participant App as Customer App
    actor Staff
    participant API as Express API
    participant DB as MongoDB (replica set)

    Note over Customer,App: 1. Tap Redeem (offline-capable)
    Customer->>App: tap "Redeem"
    App->>App: switch QR intent earn→redeem, recompute HMAC locally
    App-->>Customer: show redeem QR

    Note over Staff,DB: 2. Staff scans (online)
    Staff->>API: POST /api/staff/scan {membershipId, intent, signature}
    API->>DB: find Customer by membershipId
    API->>API: recompute HMAC(seed, id|intent), constant-time compare
    API-->>Staff: {customerName, stampBalance, intent:"redeem"}

    Note over Staff,DB: 3. Staff confirms (only deduction point — R1)
    Staff->>API: POST /api/staff/redeem {membershipId}
    API->>DB: startSession / withTransaction
    API->>DB: findOneAndUpdate({customerId, stampBalance>=10}, $inc -10)
    alt matched (balance was >= 10)
        API->>DB: insert StampTransaction(Redeem, -10)
        API->>DB: insert Redemption(...)
        API->>DB: commit
        API-->>Staff: {stampBalance, redemptionId}
        API->>Customer: Web Push "Cheers — coffee's on the house"
        Staff-->>Customer: hand over coffee ☕
    else not matched (insufficient)
        API->>DB: abort transaction (no writes)
        API-->>Staff: 409 "Not quite there yet…"
    end
```
