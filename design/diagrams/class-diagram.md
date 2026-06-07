# BrewPoints — UML Class Diagram (domain model)

Reverse-engineered from `server/src/db.ts` (Mongoose models). Private (`-`) fields are server-only
secrets that never leave the backend in any API payload (red line R3). Integer surrogate keys
(`customerId`, `staffId`, …) are allocated from the `Counter` collection.

```mermaid
classDiagram
    class Customer {
        +int customerId
        +string name
        +string email
        +string~null~ phone
        +string authProvider
        -string~null~ passwordHash
        +int stampBalance
        +string membershipId
        -string qrSeed
        +Date createdAt
    }

    class Staff {
        +int staffId
        +string name
        +string email
        -string~null~ passwordHash
        +string role
        +Date createdAt
    }

    class StampTransaction {
        +int transactionId
        +int customerId
        +int staffId
        +int stampValue
        +string transactionType
        +string~null~ note
        +Date createdAt
    }

    class Redemption {
        +int redemptionId
        +int customerId
        +int staffId
        +string rewardName
        +int stampsUsed
        +Date redeemedAt
    }

    class PushSubscription {
        +int customerId
        +string endpoint
        +string p256dh
        +string auth
        +Date createdAt
    }

    class Counter {
        +string _id
        +int seq
    }

    Customer "1" --> "0..*" StampTransaction : earns / redeems
    Customer "1" --> "0..*" Redemption : receives
    Customer "1" --> "0..*" PushSubscription : registers
    Staff "1" --> "0..*" StampTransaction : records
    Staff "1" --> "0..*" Redemption : confirms
```

## Notes
- **R2 (source of truth):** `StampTransaction` is the authoritative ledger; `Customer.stampBalance`
  is a derived cache. `transactionType ∈ {Earn, Redeem, Adjustment}`, `stampValue` is signed
  (+1/+2 earn, −10 redeem).
- **R3 (offline QR):** `qrSeed` is the per-customer HMAC key — stored only here, never in a QR payload.
- **Append-only ledger:** transactions are created and read, never updated/deleted (audit integrity).
