import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { config } from '../config.js'
import { logger } from '../logger.js'
import { findOrCreateGoogleCustomer } from './service.js'

// Google OAuth — standard authorization-code flow (PDR 15.2, Task 2.2).
//   GET /api/auth/google           → redirect to Google consent
//   GET /api/auth/google/callback  → exchange code, verify id_token, sign in / sign up, hand session to SPA

export const googleRouter = Router()

const STATE_TTL_MS = 5 * 60 * 1000
const pendingStates = new Map<string, number>() // state → expiry (in-memory CSRF guard, single instance)

function isConfigured(): boolean {
  return config.google.clientId !== '' && config.google.clientSecret !== ''
}

function newClient(): OAuth2Client {
  return new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl,
  )
}

function loginRedirect(error: string): string {
  return `${config.frontendUrl}/login?error=${error}`
}

googleRouter.get('/google', (_req, res) => {
  if (!isConfigured()) {
    res.status(503).json({ error: 'Google sign-in is not configured.' })
    return
  }
  const now = Date.now()
  for (const [value, expiry] of pendingStates) if (expiry < now) pendingStates.delete(value)

  const state = randomBytes(16).toString('base64url')
  pendingStates.set(state, now + STATE_TTL_MS)

  res.redirect(
    newClient().generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account', // always show the account chooser so customers can switch accounts
      state,
    }),
  )
})

googleRouter.get('/google/callback', async (req, res) => {
  try {
    if (!isConfigured()) {
      res.redirect(loginRedirect('google_unconfigured'))
      return
    }
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    if (code === '' || state === '' || !pendingStates.has(state)) {
      res.redirect(loginRedirect('google_state'))
      return
    }
    pendingStates.delete(state)

    const client = newClient()
    const { tokens } = await client.getToken(code)
    if (!tokens.id_token) {
      res.redirect(loginRedirect('google_token'))
      return
    }
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google.clientId,
    })
    const payload = ticket.getPayload()
    if (!payload?.email || payload.email_verified === false) {
      res.redirect(loginRedirect('google_email'))
      return
    }

    const result = await findOrCreateGoogleCustomer(payload.email, payload.name ?? '')
    // Hand the session to the SPA via the URL fragment (not sent to servers / not logged).
    const encoded = Buffer.from(JSON.stringify(result), 'utf8').toString('base64url')
    res.redirect(`${config.frontendUrl}/auth/callback#session=${encoded}`)
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback failed')
    res.redirect(loginRedirect('google_failed'))
  }
})
