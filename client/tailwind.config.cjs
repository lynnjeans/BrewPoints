// Client Tailwind config. The design system lives in /design and is consumed as a preset
// (Appendix D.9.3). All bp-* tokens come from there — do not redefine colors/spacing here.
const preset = require('../design/tailwind.config.js')

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
}
