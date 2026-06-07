# BrewPoints UI tokens — implementation reference

> Use these snippets verbatim. They are the source of truth for component implementations referenced in Appendix D.
> Both Tailwind and plain CSS variants are provided; pick whichever matches your stack and use it consistently.

## Setup

**Option A — Tailwind**
```js
// tailwind.config.js → use the file at /design/tailwind.config.js
import preset from './design/tailwind.config.js';
export default { presets: [preset], content: [...] };
```

**Option B — Plain CSS**
```html
<link rel="stylesheet" href="/design/brewpoints-tokens.css" />
```

Either approach exposes the same design tokens. The Tailwind config exposes them as utility classes; the CSS file exposes them as variables + a small set of `.bp-*` component classes.

---

## Component cheatsheet

### Eyebrow (small uppercase label above a heading)
```html
<!-- Tailwind -->
<div class="text-bp-eyebrow text-bp-stone uppercase">REWARDS</div>

<!-- Plain CSS -->
<div class="bp-eyebrow">REWARDS</div>
```

### Page title (used after eyebrow)
```html
<!-- Tailwind -->
<div class="text-bp-title text-bp-ink">Your coffees<br>earned.</div>

<!-- Plain CSS -->
<div style="font-size:26px; font-weight:500; letter-spacing:-0.5px; line-height:1.1; color:var(--bp-ink)">
  Your coffees<br>earned.
</div>
```

### Card (default white surface)
```html
<!-- Tailwind -->
<div class="bg-bp-card border border-bp-card-border rounded-bp-card p-[22px_20px]">
  ...
</div>

<!-- Plain CSS -->
<div class="bp-card">...</div>
```

### Card (ink, used for full state / staff disconnected / profile stats)
```html
<!-- Tailwind -->
<div class="bg-bp-ink text-bp-paper rounded-bp-card p-[24px_20px]">
  ...
</div>

<!-- Plain CSS -->
<div class="bp-card bp-card--ink">...</div>
```

### Primary button (default ink)
```html
<!-- Tailwind -->
<button class="w-full bg-bp-ink text-bp-paper rounded-bp-button px-4 py-4
  font-medium text-[14px] tracking-[0.02em]">
  Continue
</button>

<!-- Plain CSS -->
<button class="bp-btn bp-btn--primary">Continue</button>
```

### Redeem button (CLAY — used in only 2 places: customer Redeem + staff Confirm)
```html
<!-- Tailwind -->
<button class="w-full bg-bp-clay text-bp-paper rounded-bp-button p-[18px]
  font-medium text-[15px] tracking-[0.02em]">
  Redeem free coffee
</button>

<!-- Plain CSS -->
<button class="bp-btn bp-btn--redeem">Redeem free coffee</button>
```

### Secondary button (outlined ink)
```html
<!-- Tailwind -->
<button class="w-full bg-transparent text-bp-ink border border-bp-ink rounded-bp-button p-[14px]
  text-[14px] font-medium">
  Sign in with email
</button>

<!-- Plain CSS -->
<button class="bp-btn bp-btn--secondary">Sign in with email</button>
```

### Ghost button (sign out / minimised actions)
```html
<button class="bp-btn bp-btn--ghost">Sign out</button>
```

### Input
```html
<!-- Tailwind -->
<input class="w-full bg-bp-card border border-bp-card-border rounded-[12px]
  px-[14px] py-[13px] text-[14px] placeholder:text-bp-stone" />

<!-- Plain CSS -->
<input class="bp-input" placeholder="you@example.co.nz" />
```

### Badge (READY / 3 TO GO etc.)
```html
<!-- Tailwind: neutral on light card -->
<span class="text-bp-badge bg-bp-paper border border-bp-card-border text-bp-ink uppercase px-[10px] py-[5px] rounded-full">3 TO GO</span>

<!-- Tailwind: ink (on light card, signals current state) -->
<span class="text-bp-badge bg-bp-ink text-bp-paper uppercase px-[10px] py-[5px] rounded-full">3 TO GO</span>

<!-- Tailwind: clay (ONLY when reward is ready) -->
<span class="text-bp-badge bg-bp-clay text-bp-paper uppercase px-[10px] py-[5px] rounded-full">READY</span>

<!-- Plain CSS -->
<span class="bp-badge bp-badge--neutral">3 TO GO</span>
<span class="bp-badge bp-badge--ink">3 TO GO</span>
<span class="bp-badge bp-badge--clay">READY</span>
```

### 10-segment progress bar (rewards page, staff detail)
```html
<!-- Tailwind: 6 filled, 4 empty -->
<div class="flex gap-[5px]">
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-fern"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-stone-light"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-stone-light"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-stone-light"></div>
  <div class="flex-1 h-[6px] rounded-[3px] bg-bp-stone-light"></div>
</div>

<!-- React/JSX: render with .map -->
{Array.from({length:10}).map((_,i)=>(
  <div key={i} className={`flex-1 h-[6px] rounded-[3px] ${i<earned?'bg-bp-fern':'bg-bp-stone-light'}`}/>
))}
```

### Stamp number (Georgia italic)
```html
<!-- Tailwind -->
<div class="font-serif italic font-medium text-bp-num text-bp-ink leading-none">7</div>

<!-- React -->
<div className="bp-num text-[28px] text-bp-ink leading-none">7</div>

<!-- Plain CSS -->
<div class="bp-num" style="font-size:28px; color:var(--bp-ink); line-height:1">7</div>
```

### Italic quote subtitle (Kiwi voice)
```html
<div class="font-serif italic text-[13px] text-bp-stone text-center leading-normal">
  "Three more cups,<br>and your shout's on us."
</div>
```

### Koru stamp ring (10 beans in spiral)
```jsx
// React. Beans at decreasing radii — first bean (i=0) sits at the outer tip,
// last bean (i=9) tucks into the centre. This visualises the koru unfurling.
const RADII = [60, 58, 56, 54, 50, 45, 38, 30, 22, 14];

function KoruRing({ earned }) {
  return (
    <svg viewBox="0 0 280 200" className="w-full">
      <defs>
        <path id="bean" d="M0,-7 C4,-7 7,-3 7,0 C7,3 4,7 0,7 C-4,7 -7,3 -7,0 C-7,-3 -4,-7 0,-7 Z M0,-4 C-2,-4 -3,-2 -3,0 C-3,2 -2,4 0,4" fill="currentColor" />
      </defs>
      <g transform="translate(140,100)">
        {RADII.map((r, i) => {
          const filled = i < earned;
          const color = earned === 10 ? '#5DCAA5' : (filled ? '#2D5F4F' : '#D8D2C2');
          return (
            <g key={i} transform={`rotate(${i * 36}) translate(${r},0)`} style={{ color }}>
              <use href="#bean" />
            </g>
          );
        })}
        <text x="0" y="-2" textAnchor="middle" className="bp-num" style={{ fontSize: 36, fill: 'var(--bp-ink)' }}>
          {earned}
        </text>
        <text x="0" y="14" textAnchor="middle" className="bp-label" style={{ fontSize: 9 }}>
          STAMPS
        </text>
      </g>
    </svg>
  );
}
```

### Bottom nav (customer)
```html
<nav class="bg-bp-ink px-bp-tablet pt-4 pb-[30px] flex justify-around">
  <button class="flex flex-col items-center gap-1">
    <svg width="20" height="20" stroke="#F5F1EA" fill="none" stroke-width="1.5">...</svg>
    <span class="text-[10px] text-bp-paper tracking-[0.05em]">Card</span>
  </button>
  <!-- inactive tabs: add opacity-55 -->
  <button class="flex flex-col items-center gap-1 opacity-55">...</button>
</nav>
```

---

## Page layout templates

### Customer mobile page
```jsx
<div className="min-h-screen bg-bp-paper text-bp-ink font-sans">
  {/* Status bar */}
  <div className="px-[24px] pt-[18px] flex justify-between text-[11px]">
    <span className="font-medium">9:41</span>
    <span>●●● 4G</span>
  </div>

  {/* Header */}
  <header className="px-[24px] pt-[20px] pb-[8px]">
    <div className="bp-eyebrow">REWARDS</div>
    <h1 className="text-bp-title mt-[6px]">Your coffees<br/>earned.</h1>
  </header>

  {/* Cards stack */}
  <main className="px-bp-page space-y-4">
    <section className="bp-card">...</section>
  </main>

  {/* Bottom nav */}
  <nav className="bg-bp-ink ...">...</nav>
</div>
```

### Staff tablet page
```jsx
<div className="min-h-screen bg-bp-paper text-bp-ink font-sans">
  {/* Header with status pill */}
  <header className="px-bp-tablet py-[20px] border-b border-bp-card-border flex justify-between">
    <div>
      <div className="bp-label">STAFF</div>
      <div className="text-bp-card-n mt-[3px]">Scan customer</div>
    </div>
    <div className="flex items-center gap-2 text-[11px] text-bp-stone">
      <span className="w-[7px] h-[7px] rounded-full bg-bp-fern"></span>
      Camera ready
    </div>
  </header>

  <main className="px-bp-tablet py-[20px] space-y-[18px]">
    {/* Optional intent banner — only when intent="redeem" */}
    <div className="bg-bp-ink text-bp-paper rounded-bp-card-sm px-[18px] py-[14px] flex items-center gap-3">
      ...
    </div>
    <section className="bp-card">...</section>
  </main>
</div>
```

---

## Don'ts (will fail D.8 review)

- ❌ `text-red-500` for errors — use `bp-clay` only when the error specifically requires staff response (see Appendix D.1 whitelist). For "not enough stamps", use the neutral info card pattern.
- ❌ `shadow-lg` on cards — Appendix D.4.1 forbids shadows; use 1px border instead.
- ❌ `text-2xl font-bold` for stamp numbers — use `bp-num` + size; Georgia italic medium, not Inter bold.
- ❌ `bg-gradient-*` anywhere — flat fills only.
- ❌ Title Case in copy: "Free Regular Coffee" → "Free regular coffee".
- ❌ Hardcoding colors like `bg-[#1A1A1A]` — always use the token (`bg-bp-ink`); changes propagate when tokens shift.
- ❌ Adding `text-bp-clay` decoratively (next-to-headings, hover states, focus rings). The 6-scenario whitelist is hard.
