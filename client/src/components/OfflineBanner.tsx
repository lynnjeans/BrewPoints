// D.7.11 — reassuring (not alarming) offline notice for the customer. Ink bar, no red/clay.
export function OfflineBanner() {
  return (
    <div className="rounded-bp-card-sm bg-bp-ink px-[16px] py-[12px] text-[13px] text-bp-paper">
      You’re offline · your QR still works
    </div>
  )
}
