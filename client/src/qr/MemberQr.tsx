import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { buildQrPayload, serializeQrPayload, type QrIntent } from './signature'

interface MemberQrProps {
  membershipId: string
  qrSeed: string
  intent: QrIntent
  /** Exposes the serialized payload to the parent (e.g. for debugging / verification). */
  onPayload?: (payloadText: string) => void
}

// Controlled QR display. Given the local seed + membershipId + intent, it computes the HMAC
// signature and renders the code — entirely offline (Web Crypto + qrcode, no network).
// The parent owns the earn/redeem intent (the clay "Redeem" button lives on the rewards card, Task 5.3).
export function MemberQr({ membershipId, qrSeed, intent, onPayload }: MemberQrProps) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    async function render() {
      const payload = await buildQrPayload(qrSeed, membershipId, intent)
      const text = serializeQrPayload(payload)
      const url = await QRCode.toDataURL(text, { margin: 2, width: 240 })
      if (cancelled) return
      setDataUrl(url)
      onPayload?.(text)
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [membershipId, qrSeed, intent, onPayload])

  const label = intent === 'earn' ? 'Member code' : 'Redemption code'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-bp-eyebrow text-bp-stone uppercase">{label}</div>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Your BrewPoints QR code"
          className="rounded-bp-card-sm border border-bp-card-border"
          width={240}
          height={240}
        />
      ) : (
        <div className="h-[240px] w-[240px] rounded-bp-card-sm border border-bp-card-border" />
      )}
      <p className="text-bp-meta text-bp-stone">Show this at the counter</p>
    </div>
  )
}
