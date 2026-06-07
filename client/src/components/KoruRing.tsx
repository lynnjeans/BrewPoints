// Stamp-progress ring — used ONLY on the coffee card (the rewards page uses the 10-segment bar).
// Product decision (overrides the D.4.7 koru spiral): a plain circle of 10 beans. Each earned
// stamp lights one bean; a full card is a complete ring. Beans fill clockwise from the top.
// Colours come from Tailwind token classes via currentColor — no hardcoded hex.
const COUNT = 10
const RADIUS = 58 // evenly-spaced ring, clear of the centre number / "STAMPS" (~r35)
const BEANS = Array.from({ length: COUNT }, (_, i) => ({
  angle: -90 + (360 / COUNT) * i, // start at 12 o'clock, go clockwise
  radius: RADIUS,
}))
const BEAN =
  'M0,-7 C4,-7 7,-3 7,0 C7,3 4,7 0,7 C-4,7 -7,3 -7,0 C-7,-3 -4,-7 0,-7 Z M0,-4 C-2,-4 -3,-2 -3,0 C-3,2 -2,4 0,4'

export function KoruRing({ earned, full }: { earned: number; full: boolean }) {
  return (
    <div className="relative mx-auto w-[280px] max-w-full">
      <svg viewBox="0 0 280 200" className="w-full">
        <g transform="translate(140,100)">
          {BEANS.map(({ angle, radius }, i) => {
            const filled = i < earned
            const colorClass = full
              ? 'text-bp-fern-bright'
              : filled
                ? 'text-bp-fern'
                : 'text-bp-stone-light'
            return (
              <g
                key={i}
                transform={`rotate(${String(angle)}) translate(${String(radius)},0)`}
                className={colorClass}
              >
                <path d={BEAN} fill="currentColor" />
              </g>
            )
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`bp-num text-[40px] leading-none ${full ? 'text-bp-paper' : 'text-bp-ink'}`}>
          {earned}
        </div>
        <div
          className={`mt-1 text-bp-label uppercase ${full ? 'text-bp-paper opacity-60' : 'text-bp-stone'}`}
        >
          stamps
        </div>
      </div>
    </div>
  )
}
