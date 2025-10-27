import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 400: 'var(--brand-400)', 500: 'var(--brand-500)', 600: 'var(--brand-600)' },
        surface: { 950: 'var(--surface-950)', 900: 'var(--surface-900)' },
        fg: { DEFAULT: 'var(--fg)', muted: 'var(--fg-muted)' },
        bg: 'var(--bg)',
        border: 'var(--border)',
      },
      borderRadius: { lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-2xl)' },
    },
  },
  plugins: [],
} satisfies Config
