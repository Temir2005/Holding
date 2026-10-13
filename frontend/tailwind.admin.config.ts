import type { Config } from 'tailwindcss'

/**
 * Tailwind for the admin only (`src/admin/styles/admin.css` loads it via `@config`).
 * Kept apart from the site config so admin classes never reach the site CSS bundle.
 *
 * `important: '.admin'` scopes every utility under the `.admin` class on <body>: inside
 * the admin they win over site utilities of the same name, and after leaving the admin
 * (body class restored) they stop applying, so the site cannot be restyled by them.
 */
const token = (name: string) => `rgb(var(--a-${name}) / <alpha-value>)`

export default {
  content: ['./src/admin/**/*.{ts,tsx}'],
  important: '.admin',
  corePlugins: { preflight: false },
  theme: {
    screens: { md: '768px', xl: '1280px', '2xl': '1536px' },
    extend: {
      colors: {
        canvas: token('canvas'),
        panel: token('panel'),
        sunken: token('sunken'),
        fg: token('fg'),
        mute: token('mute'),
        line: token('line'),
        'line-strong': token('line-strong'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        'on-accent': token('on-accent'),
        ring: token('ring'),
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
        success: token('success'),
        'success-soft': token('success-soft'),
        warning: token('warning'),
        'warning-soft': token('warning-soft'),
        info: token('info'),
        'info-soft': token('info-soft'),
      },
      fontFamily: {
        sans: ['"Golos Text"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', lg: '8px' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      spacing: { sidebar: '15rem', rail: '4rem', topbar: '3.5rem', bottombar: '4rem' },
      zIndex: { nav: '30', overlay: '40', modal: '50', toast: '60' },
    },
  },
  plugins: [],
} satisfies Config
