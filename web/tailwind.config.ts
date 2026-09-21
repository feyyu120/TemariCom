import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        textTertiary: 'var(--color-text-tertiary)',
        iconPrimary: 'var(--color-icon-primary)',
        iconSecondary: 'var(--color-icon-secondary)',
        active: {
          DEFAULT: 'var(--color-active)',
          text: 'var(--color-active-text)',
        },
        danger: 'var(--color-danger)',
        unread: 'var(--color-unread)',
        verification: 'var(--color-verification)',
      },
      borderRadius: {
        small: '6px',
        medium: '10px',
        large: '14px',
        card: '12px',
        pill: '9999px',
      },
      fontFamily: {
        sans: [
          'Chirp',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config

