import { Router, type Request, type Response } from 'express'
import { AuthError } from './errors.js'
import { loginCustomer, loginStaff, registerCustomer } from './service.js'
import { validateLogin, validateRegister } from './validation.js'

export const authRouter = Router()

function handleError(err: unknown, req: Request, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  req.log.error({ err }, 'auth route failed')
  res.status(500).json({ error: 'Something went wrong on our end.' })
}

authRouter.post('/register', async (req, res) => {
  try {
    const input = validateRegister(req.body)
    const result = await registerCustomer(input)
    res.status(201).json(result)
  } catch (err) {
    handleError(err, req, res)
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const input = validateLogin(req.body)
    const result = await loginCustomer(input)
    res.json(result)
  } catch (err) {
    handleError(err, req, res)
  }
})

authRouter.post('/staff/login', async (req, res) => {
  try {
    const input = validateLogin(req.body)
    const result = await loginStaff(input)
    res.json(result)
  } catch (err) {
    handleError(err, req, res)
  }
})
