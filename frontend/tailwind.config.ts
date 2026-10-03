import type { Config } from 'tailwindcss'

// Colors point at CSS variables (src/styles/tokens.css). Semantic names
// (surface, fg, tile...) change per section tone, so components never need to know
// whether they sit on a dark or a light section.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        tile: 'rgb(var(--tile) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-mute': 'rgb(var(--fg-mute) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        graphite: 'rgb(var(--graphite) / <alpha-value>)',
        stone: 'rgb(var(--stone) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
        body: ['"Golos Text"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(2.4rem, 6.2vw, 6rem)', { lineHeight: '0.98', letterSpacing: '-0.035em' }],
        h2: ['clamp(1.75rem, 3.2vw, 2.9rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        h3: ['clamp(1.15rem, 1.5vw, 1.35rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        stat: ['clamp(2rem, 3.6vw, 3.25rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        lead: ['clamp(1.05rem, 1.3vw, 1.2rem)', { lineHeight: '1.6' }],
      },
      maxWidth: { container: '90rem', prose: '62ch' },
      borderRadius: { tile: '6px' },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.7,.2,1)' },
    },
  },
  plugins: [],
} satisfies Config
