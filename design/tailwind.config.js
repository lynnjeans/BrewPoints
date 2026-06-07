module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bp: {
          paper: {
            DEFAULT: '#F5F1EA',
            warm:    '#E8E2D5',
          },
          card: {
            DEFAULT: '#FFFFFF',
            border:  '#E0DAC9',
          },
          divider:    '#F0EBE0',
          ink: {
            DEFAULT: '#1A1A1A',
            soft:    '#2A2A2A',
          },
          stone: {
            DEFAULT: '#8A8580',
            light:   '#D8D2C2',
          },
          fern: {
            DEFAULT: '#2D5F4F',
            bright:  '#5DCAA5',
          },
          clay: {
            DEFAULT: '#C44A1F',
            soft:    '#FFEEE5',
          },
          alert:     '#8A5A1A',  // muted amber for form/auth errors — NOT clay, NOT red
        },
      },
      fontFamily: {
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'bp-badge':   ['10px', { lineHeight: '1.2',  letterSpacing: '0.15em', fontWeight: '500' }],
        'bp-label':   ['11px', { lineHeight: '1.3',  letterSpacing: '0.14em', fontWeight: '500' }],
        'bp-eyebrow': ['12px', { lineHeight: '1.3',  letterSpacing: '0.20em', fontWeight: '500' }],
        'bp-meta':    ['13px', { lineHeight: '1.5' }],
        'bp-body':    ['14px', { lineHeight: '1.6' }],
        'bp-card-h':  ['16px', { lineHeight: '1.3',  fontWeight: '500' }],
        'bp-card-n':  ['18px', { lineHeight: '1.2',  fontWeight: '500' }],
        'bp-num':     ['28px', { lineHeight: '1',    fontWeight: '500' }],
        'bp-title':   ['26px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '500' }],
        'bp-brand':   ['32px', { lineHeight: '1',    letterSpacing: '-0.02em', fontWeight: '500' }],
      },
      borderRadius: {
        'bp-button':  '14px',
        'bp-card-sm': '16px',
        'bp-card':    '20px',
        'bp-phone':   '24px',
      },
      spacing: {
        'bp-card-px': '20px',
        'bp-card-py': '22px',
        'bp-row-px':  '18px',
        'bp-row-py':  '14px',
        'bp-page':    '20px',
        'bp-tablet':  '24px',
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.bp-num': {
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontWeight: '500',
        },
        '.bp-eyebrow': {
          fontSize: '12px',
          fontWeight: '500',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: '#8A8580',
        },
        '.bp-label': {
          fontSize: '11px',
          fontWeight: '500',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#8A8580',
        },
      });
    },
  ],
};
