import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Camera QR scanner (html5-qrcode). Calls onDecode with the raw decoded text. If the camera is
// unavailable (e.g. no device / no permission), it degrades gracefully — the parent always offers
// a manual-entry fallback.
export function Scanner({ onDecode }: { onDecode: (text: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onDecodeRef = useRef(onDecode)
  onDecodeRef.current = onDecode
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.id = 'qr-reader'
    const scanner = new Html5Qrcode('qr-reader')
    let stopped = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          if (stopped) return
          stopped = true
          void scanner.stop().catch(() => undefined)
          onDecodeRef.current(decoded)
        },
        () => undefined, // ignore per-frame "not found" noise
      )
      .catch(() => setCameraError(true))

    return () => {
      stopped = true
      scanner.stop().catch(() => undefined)
    }
    // Mount-once: latest onDecode is read via onDecodeRef.
  }, [])

  return (
    <div>
      <div
        ref={containerRef}
        className="mx-auto w-[240px] overflow-hidden rounded-bp-card border border-bp-card-border"
      />
      {cameraError && (
        <p className="mt-2 text-center text-[12px] text-bp-stone">
          Camera unavailable — enter the code below.
        </p>
      )}
    </div>
  )
}
