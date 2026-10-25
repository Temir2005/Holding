import type { Config } from 'tailwindcss'

// The site is styled by src/styles/globals.css (component classes on CSS variables from
// tokens.css); Tailwind adds preflight and the few utilities used inline (sr-only, layout).
// The admin has its own config (tailwind.admin.config.ts): its classes stay out of the site CSS.
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '!./src/admin/**'],
  theme: {
    extend: {
      colors: {
        surface: rgb('surface'),
        fg: rgb('fg'),
        'fg-mute': rgb('fg-mute'),
        plate: rgb('plate'),
      },
      fontFamily: { sans: ['var(--font-sans)'] },
      zIndex: { header: 'var(--z-header)', menu: 'var(--z-menu)', toast: 'var(--z-toast)' },
    },
  },
  plugins: [],
} satisfies Config
