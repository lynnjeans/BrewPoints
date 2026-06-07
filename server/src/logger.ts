import { pino } from 'pino'
import { config } from './config.js'

// Structured application logger (Task 07). One shared pino instance:
// - JSON output (industry-standard, machine-parseable, ready for any log aggregator).
// - Level from LOG_LEVEL, defaulting to "debug" in dev and "info" in production.
// - Redaction: tokens and password fields are stripped so secrets never reach the logs.
export const logger = pino({
  level: config.logLevel,
  base: { service: 'brewpoints-server' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'qrSeed',
      '*.qrSeed',
    ],
    remove: true,
  },
})
