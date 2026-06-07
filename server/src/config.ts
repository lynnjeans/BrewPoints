// Type-safe configuration. Reads from process.env (loaded from server/.env via dotenv)
// and validates at import time. Missing required vars or invalid values throw a single,
// clear error so the server fails fast on startup instead of misbehaving later.
import { config as loadEnv } from 'dotenv'

loadEnv()

const missing: string[] = []
const invalid: string[] = []

function required(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    missing.push(name)
    return ''
  }
  return value.trim()
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]
  return value !== undefined && value.trim() !== '' ? value.trim() : fallback
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) {
    invalid.push(`${name} must be a positive integer (got "${raw}")`)
    return fallback
  }
  return n
}

const nodeEnv = optional('NODE_ENV', 'development')

const parsed = {
  nodeEnv,
  // Log verbosity (Task 07). Defaults: debug in dev, info in prod. Set LOG_LEVEL=silent in tests.
  logLevel: optional('LOG_LEVEL', nodeEnv === 'production' ? 'info' : 'debug'),
  port: positiveInt('PORT', 3001),
  // MongoDB connection string. Local dev expects a single-node replica set (see DB_SETUP.md);
  // production points at MongoDB Atlas (a replica set by default) — required for transactions (R2).
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  // Web Push (Task 05). VAPID keys are generated once via `npm run vapid:generate`.
  // Optional until push is configured; the push module asserts presence when used.
  vapid: {
    publicKey: optional('VAPID_PUBLIC_KEY', ''),
    privateKey: optional('VAPID_PRIVATE_KEY', ''),
    subject: optional('VAPID_SUBJECT', 'mailto:hello@brewpoints.local'),
  },
  // Google OAuth credentials are optional until Task 2.2 wires up OAuth.
  // Once 2.2 lands, that module should assert these are present.
  google: {
    clientId: optional('GOOGLE_CLIENT_ID', ''),
    clientSecret: optional('GOOGLE_CLIENT_SECRET', ''),
    callbackUrl: optional('GOOGLE_CALLBACK_URL', 'http://localhost:3001/api/auth/google/callback'),
  },
  // Where to send the browser back after OAuth completes.
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  stampsForFreeCoffee: positiveInt('STAMPS_FOR_FREE_COFFEE', 10),
} as const

if (missing.length > 0 || invalid.length > 0) {
  const lines = [
    'Invalid configuration — the BrewPoints server cannot start:',
    ...missing.map((name) => `  - missing required env var: ${name}`),
    ...invalid.map((message) => `  - ${message}`),
    '',
    'Copy server/.env.example to server/.env and fill in the values (incl. MONGODB_URI).',
  ]
  throw new Error(lines.join('\n'))
}

export type AppConfig = typeof parsed
export const config: AppConfig = parsed
