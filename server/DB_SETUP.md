# MongoDB setup (local + Atlas)

BrewPoints uses **MongoDB** via Mongoose. The redemption flow writes the stamp deduction, the
`Redeem` transaction, and the `Redemption` record inside **one multi-document transaction** (red-line
R2). MongoDB only supports multi-document transactions on a **replica set**, so a bare standalone
`mongod` will throw `Transaction numbers are only allowed on a replica set member or mongos`.

You have three options. Pick one.

## Option A — Local single-node replica set (recommended for dev)

1. Stop any standalone `mongod`.
2. Start mongod as a replica set:
   ```powershell
   mongod --dbpath C:\data\db --replSet rs0
   ```
3. In a second terminal, initiate the set once (first time only):
   ```powershell
   mongosh --eval "rs.initiate()"
   ```
4. Use this in `server/.env`:
   ```
   MONGODB_URI="mongodb://127.0.0.1:27017/brewpoints?replicaSet=rs0"
   ```

## Option B — MongoDB Atlas (recommended for production + the replication bonus)

Atlas clusters are replica sets out of the box (transactions just work, and this is what earns the
rubric's replication/scaling bonus marks — screenshot the cluster's replica-set topology for the report).

```
MONGODB_URI="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/brewpoints?retryWrites=true&w=majority"
```

## Option C — Docker single-node replica set

```bash
docker run -d --name brewpoints-mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec brewpoints-mongo mongosh --eval "rs.initiate()"
```

## Tests

Tests do **not** need any of the above — they spin up an in-memory replica set automatically
(`mongodb-memory-server`, see `test/global-setup.ts`). Just run `npm test`.

## Seeding

With the DB running and `MONGODB_URI` set: `npm run seed`.
