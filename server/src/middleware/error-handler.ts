import type { ErrorRequestHandler, RequestHandler } from 'express'
import { logger } from '../logger.js'

// 404 for any unmatched route — returns clean JSON instead of Express's default HTML.
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}

// Central error handler (Task 07). The last middleware: it logs the full error with request
// context (for troubleshooting / root-cause analysis) but returns a safe, generic message to the
// client — stack traces and internals never leak to the response.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs 4 args to treat this as error middleware
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  logger.error(
    { err, method: req.method, path: req.path },
    'Unhandled error while processing request',
  )
  if (res.headersSent) return
  res.status(500).json({ error: 'Something went wrong on our end.' })
}
