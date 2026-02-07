import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          action: 'var(--color-action)',
          actionText: 'var(--color-action-text)',
          danger: 'var(--color-danger)'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
