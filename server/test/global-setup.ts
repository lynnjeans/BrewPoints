import { MongoMemoryReplSet } from 'mongodb-memory-server'
import type { GlobalSetupContext } from 'vitest/node'

// Spin up an in-memory MongoDB REPLICA SET once for the whole suite. A replica set (not a
// standalone) is required because the redeem path uses a multi-document transaction (R2).
// The URI is handed to the test workers via Vitest's provide/inject channel.
let replSet: MongoMemoryReplSet

export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  provide('mongoUri', replSet.getUri())
}

export async function teardown(): Promise<void> {
  await replSet?.stop()
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}
