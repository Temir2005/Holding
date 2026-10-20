import type { Config } from 'tailwindcss'

// Colors point at CSS variables (src/styles/tokens.css). Semantic names
// (surface, fg, line, trace...) change per section tone, so components never need to know
// whether they sit on a dark, light or accent section.
// The admin has its own config (tailwind.admin.config.ts): its classes stay out of the site CSS.
const tone = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '!./src/admin/**'],
  theme: {
    extend: {
      colors: {
        surface: tone('surface'),
        'surface-2': tone('surface-2'),
        tile: tone('tile'),
        fg: tone('fg'),
        'fg-mute': tone('fg-mute'),
        line: tone('line'),
        'line-strong': tone('line-strong'),
        plate: tone('plate'),
        trace: tone('trace'),
        accent: tone('accent'),
        'on-accent': tone('on-accent'),
        // raw materials, for the few places that must not follow the tone
        paper: tone('paper'),
        carbon: tone('carbon'),
        graphite: tone('graphite'),
        chalk: tone('chalk'),
        deep: tone('deep'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)'],
        body: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        // the "Чертёж" scale
        display: ['var(--fs-display)', { lineHeight: '0.94', letterSpacing: '-0.04em' }],
        title: ['var(--fs-h2)', { lineHeight: '1', letterSpacing: '-0.033em' }],
        subtitle: ['var(--fs-h3)', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        'stat-hero': ['var(--fs-stat-hero)', { lineHeight: '0.82', letterSpacing: '-0.06em' }],
        'stat-lg': ['var(--fs-stat)', { lineHeight: '0.9', letterSpacing: '-0.045em' }],
        lead: ['var(--fs-lead)', { lineHeight: '1.45', letterSpacing: '-0.006em' }],
        body: ['var(--fs-body)', { lineHeight: '1.5' }],
        caption: ['var(--fs-caption)', { lineHeight: '1.45', letterSpacing: '0.08em' }],
        // Legacy sizes of sections not yet redesigned (stages 2–3 remove them): same values as
        // before, so their layouts (narrow columns, five stats in a row) do not break meanwhile.
        hero: ['clamp(2.4rem, 6.2vw, 6rem)', { lineHeight: '0.98', letterSpacing: '-0.035em' }],
        h2: ['clamp(1.75rem, 3.2vw, 2.9rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        h3: ['clamp(1.15rem, 1.5vw, 1.35rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        stat: ['clamp(2rem, 3.6vw, 3.25rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },
      fontWeight: { heading: '650' },
      spacing: {
        'pad-l': 'var(--pad-l)',
        'pad-r': 'var(--pad-r)',
        gap: 'var(--gap)',
        header: 'var(--header-h)',
        'section-y': 'var(--section-y)',
        'section-y-end': 'var(--section-y-end)',
      },
      maxWidth: { container: 'var(--sheet-max)', sheet: 'var(--sheet-max)', prose: '62ch' },
      borderRadius: { tile: '2px' },
      zIndex: {
        trace: 'var(--z-trace)',
        sticky: 'var(--z-sticky)',
        header: 'var(--z-header)',
        menu: 'var(--z-menu)',
        toast: 'var(--z-toast)',
      },
      transitionDuration: { 1: '150ms', 2: '300ms', 3: '450ms', 4: '700ms', 5: '1100ms' },
      transitionTimingFunction: {
        out: 'cubic-bezier(.2,.7,.2,1)',
        'in-out': 'cubic-bezier(.6,0,.2,1)',
      },
    },
  },
  plugins: [],
} satisfies Config
