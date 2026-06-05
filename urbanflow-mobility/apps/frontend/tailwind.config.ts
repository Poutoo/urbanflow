import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A5F7A',
        secondary: '#2D7D46',
        accent: '#B85C00',
        bg: '#F7F9FC',
        surface: '#FFFFFF',
        muted: '#6B7280',
        'text-main': '#0F1B2D',
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
