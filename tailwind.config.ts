import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0e1116',
          soft: '#161b23',
          line: '#242c38',
        },
        brand: {
          50: '#fdf8ec',
          100: '#f8ecc9',
          200: '#f0d894',
          300: '#e6bf57',
          400: '#dca92c',
          500: '#c9901c',
          600: '#a86f16',
          700: '#855215',
          800: '#6f4318',
          900: '#5f3819',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
