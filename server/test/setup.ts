import { afterAll, afterEach, beforeAll, inject } from 'vitest'
import { connectDb, disconnectDb, mongoose } from '../src/db.js'

// Runs in every test worker. Connect once to the in-memory replica set provided by global-setup,
// wipe every collection (including the id counters) between tests for isolation, and disconnect
// at the end. Individual test files no longer manage the connection or clearing.
beforeAll(async () => {
  await connectDb(inject('mongoUri'))
})

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
})

afterAll(async () => {
  await disconnectDb()
})
