export type QrIntent = 'earn' | 'redeem'

export interface QrPayload {
  membershipId: string
  intent: QrIntent
  signature: string
}

// Canonical signing contract — the server verifier (Task 3.3) MUST mirror this exactly:
//   HMAC-SHA256, key = UTF-8(qrSeed), message = `${membershipId}|${intent}`, output = lowercase hex.
// Deterministic: same (seed, membershipId, intent) always yields the same signature.
// No timestamp / no rolling window — long-lived signatures are intentional (R3, forwarding allowed).

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function computeQrSignature(
  qrSeed: string,
  membershipId: string,
  intent: QrIntent,
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(qrSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${membershipId}|${intent}`))
  return toHex(signature)
}

export async function buildQrPayload(
  qrSeed: string,
  membershipId: string,
  intent: QrIntent,
): Promise<QrPayload> {
  const signature = await computeQrSignature(qrSeed, membershipId, intent)
  return { membershipId, intent, signature }
}

// Only these three fields ever go into the QR — never the seed or any personal data (R3).
export function serializeQrPayload(payload: QrPayload): string {
  return JSON.stringify({
    membershipId: payload.membershipId,
    intent: payload.intent,
    signature: payload.signature,
  })
}
