import { describe, expect, it } from 'vitest'
import { Customer, PushSubscription, Redemption, StampTransaction } from '../src/db.js'
import { AuthError } from '../src/auth/errors.js'
import { deleteCustomer, registerCustomer, updateCustomer } from '../src/auth/service.js'
import { addEarns, makeStaff } from './helpers.js'

async function register() {
  return registerCustomer({ name: 'Uma', email: 'uma@example.co.nz', phone: '021 000 1', password: 'secret6' })
}

describe('updateCustomer (CRUD: Update)', () => {
  it('updates name and phone', async () => {
    const { customer } = await register()
    const updated = await updateCustomer(customer.customerId, { name: 'Uma Two', phone: '021 999 9' })
    expect(updated.name).toBe('Uma Two')
    expect(updated.phone).toBe('021 999 9')
  })

  it('clears phone when set to null/empty', async () => {
    const { customer } = await register()
    const updated = await updateCustomer(customer.customerId, { phone: null })
    expect(updated.phone).toBeNull()
  })

  it('rejects an empty name', async () => {
    const { customer } = await register()
    await expect(updateCustomer(customer.customerId, { name: '   ' })).rejects.toBeInstanceOf(AuthError)
  })

  it('rejects an update for an unknown customer', async () => {
    await expect(updateCustomer(999999, { name: 'X' })).rejects.toBeInstanceOf(AuthError)
  })

  it('never changes balance or email via update', async () => {
    const { customer } = await register()
    const before = await Customer.findOne({ customerId: customer.customerId }).lean()
    await updateCustomer(customer.customerId, { name: 'Renamed' })
    const after = await Customer.findOne({ customerId: customer.customerId }).lean()
    expect(after?.email).toBe(before?.email)
    expect(after?.stampBalance).toBe(before?.stampBalance)
  })
})

describe('deleteCustomer (CRUD: Delete)', () => {
  it('removes the customer and cascades their data', async () => {
    const { customer } = await register()
    const staff = await makeStaff()
    await addEarns(customer.customerId, staff.staffId, 3)
    await PushSubscription.create({
      customerId: customer.customerId,
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p', auth: 'a' },
    })

    await deleteCustomer(customer.customerId)

    expect(await Customer.countDocuments({ customerId: customer.customerId })).toBe(0)
    expect(await StampTransaction.countDocuments({ customerId: customer.customerId })).toBe(0)
    expect(await Redemption.countDocuments({ customerId: customer.customerId })).toBe(0)
    expect(await PushSubscription.countDocuments({ customerId: customer.customerId })).toBe(0)
  })

  it('rejects deleting an unknown customer', async () => {
    await expect(deleteCustomer(999999)).rejects.toBeInstanceOf(AuthError)
  })
})
