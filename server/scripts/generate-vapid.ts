import webpush from 'web-push'

// One-off helper (Task 05): generate a VAPID key pair for Web Push.
// Run: npm run vapid:generate  → then paste the values into server/.env.
const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.info('VAPID key pair generated. Add these to server/.env:\n')
console.info(`VAPID_PUBLIC_KEY="${publicKey}"`)
console.info(`VAPID_PRIVATE_KEY="${privateKey}"`)
console.info('\nThe public key must also be exposed to the client (VITE_VAPID_PUBLIC_KEY).')
