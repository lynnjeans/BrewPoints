import { Router, type Response } from 'express'
import { AuthError } from './errors.js'
import { loginCustomer, loginStaff, registerCustomer } from './service.js'
import { validateLogin, validateRegister } from './validation.js'

export const authRouter = Router()

function handleError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our end.' })
}

authRouter.post('/register', async (req, res) => {
  try {
    const input = validateRegister(req.body)
    const result = await registerCustomer(input)
    res.status(201).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const input = validateLogin(req.body)
    const result = await loginCustomer(input)
    res.json(result)
  } catch (err) {
    handleError(err, res)
  }
})

authRouter.post('/staff/login', async (req, res) => {
  try {
    const input = validateLogin(req.body)
    const result = await loginStaff(input)
    res.json(result)
  } catch (err) {
    handleError(err, res)
  }
})
