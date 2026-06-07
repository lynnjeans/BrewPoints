# Troubleshooting, logging & debugging — Task 07

This document covers (1) the logging setup, (2) the error-handling architecture, (3) how to debug
with breakpoints and variable watchers, and (4) real runtime issues hit during development with
their root-cause analysis and fix — material for the final-report reflection.

## 1. Logging (pino)

- Shared structured logger: `src/logger.ts` (pino). JSON output, one line per event.
- HTTP request logging: `pino-http` in `src/index.ts` logs every request with
  `method`, `url`, `statusCode`, `responseTime`, and a per-request `req.id`. Inside handlers, use
  `req.log.error(...)` so the log line is correlated to the request.
- **Secret redaction**: `authorization`/`cookie` headers and any `password`/`passwordHash`/`qrSeed`
  fields are stripped before logging (see the `redact` config) — secrets never reach the logs.
- Level: `LOG_LEVEL` env (`trace|debug|info|warn|error|fatal|silent`); defaults to `debug` in dev,
  `info` in prod, and is forced to `silent` in tests.

Example startup + request log (verified):
```
{"level":30,"service":"brewpoints-server","port":3001,"msg":"BrewPoints server listening on http://localhost:3001"}
{"level":30,"service":"brewpoints-server","req":{"id":1,"method":"GET","url":"/api/health"},"res":{"statusCode":200},"responseTime":4,"msg":"request completed"}
{"level":30,"service":"brewpoints-server","req":{"id":2,"method":"GET","url":"/api/does-not-exist"},"res":{"statusCode":404},"responseTime":1,"msg":"request completed"}
```

## 2. Error handling

- **Typed domain errors** (`AuthError`, `StampError`) carry an HTTP status; route handlers map them
  to a clean JSON response with the user-facing message.
- **Central error handler** (`src/middleware/error-handler.ts`) is the last middleware: it logs the
  full error with request context but returns a generic `500` body — stack traces never leak.
- **404 handler** returns JSON (`{ "error": "Not found: GET /api/x" }`) instead of Express's HTML.

## 3. Debugging with breakpoints & variable watchers (VS Code)

1. Open the Run & Debug panel, pick **"Debug server (tsx)"** (config in `.vscode/launch.json`).
2. Set a breakpoint — e.g. in `src/loyalty/redeem.ts` on the atomic conditional update line.
3. Add **Watch** expressions for: `membershipId`, `threshold`, `customer`, `updated`.
4. Trigger `POST /api/staff/redeem` (Postman). Execution pauses; step over and watch `updated` go
   from the matched document to `null` when the balance is below the threshold — this is exactly
   where the "insufficient stamps" branch is taken.

For tests, use **"Debug current test file (vitest)"** to step through a failing assertion.

## 4. Real issues & root-cause analysis (development log)

### Issue A — `Transaction numbers are only allowed on a replica set member or mongos`
- **Symptom:** redeem failed at runtime after the MongoDB migration; earn/login worked.
- **Isolation:** the error only occurred on the redeem path, which is the only code using a
  multi-document transaction (`withTransaction` in `redeem.ts`). Login/earn-by-seed didn't.
- **Root cause:** MongoDB transactions require a **replica set**; a standalone `mongod` can't run them.
- **Fix:** run a single-node replica set locally (`mongod --replSet rs0` + `rs.initiate()`), and use
  MongoDB Atlas (a replica set by default) in the cloud. Tests use `mongodb-memory-server` as a
  replica set. See `DB_SETUP.md`.

### Issue B — Server exits immediately with a config error
- **Symptom:** `Invalid configuration — the BrewPoints server cannot start: missing required env var: MONGODB_URI`.
- **Root cause:** `.env` not filled in. This is **intentional fail-fast** (`src/config.ts`) — better a
  clear startup error than confusing failures later.
- **Fix:** copy `.env.example` → `.env`, set `MONGODB_URI` and `JWT_SECRET`.

### Issue C — `tsx` fails to parse a source file on Windows
- **Symptom:** a script written via PowerShell `Set-Content -Encoding utf8` failed to run under tsx.
- **Root cause:** PowerShell adds a UTF-8 **BOM**, which the loader chokes on.
- **Fix:** write source files without a BOM (the editor/tooling here does).

### Issue D — `npm --prefix server install` behaves oddly on Windows
- **Root cause:** a self-reference bug with `--prefix` in this environment.
- **Fix:** `cd` into each package and run `npm install` there.
