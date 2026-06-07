// Inline koru-bean mark (matches /design/assets/logo-glyph.svg). Uses currentColor so the colour
// is controlled by the parent's text-* class (e.g. text-bp-ink) — keeps it token-driven.
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="BrewPoints"
    >
      <g transform="translate(90,90)">
        <path
          d="M 0,-58 Q 50,-58 60,0 Q 60,50 12,60 Q -28,60 -32,22 Q -32,-6 -6,-10 Q 16,-10 16,12 Q 16,22 6,22"
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle cx="6" cy="22" r="9" fill="currentColor" />
      </g>
    </svg>
  )
}
