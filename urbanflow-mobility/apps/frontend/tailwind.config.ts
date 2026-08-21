import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens theme-aware : valeurs RGB définies dans globals.css (:root / .dark),
        // le format rgb(var(...) / <alpha-value>) préserve le support des modificateurs
        // d'opacité Tailwind (bg-primary/10, border-primary-content/30, etc.)
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-content': 'rgb(var(--color-primary-content) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'secondary-content': 'rgb(var(--color-secondary-content) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-content': 'rgb(var(--color-accent-content) / <alpha-value>)',
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        'text-main': 'rgb(var(--color-text) / <alpha-value>)',
        divider: 'rgb(var(--color-divider) / <alpha-value>)',
        transport: {
          velo: '#16A34A',
          bus: '#1D4ED8',
          trottinette: '#0891B2',
          marche: '#7C3AED',
          metro: '#4F46E5',
          tram: '#B45309',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn: '24px',
        badge: '999px',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};

export default config;
