/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Sky-blue brand
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // primary
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Neutral near-black surfaces (dark), shadcn/zinc style. Light shades kept for light mode.
        slate: {
          700: '#2e2e33', // subtle hover surface
          750: '#232327',
          800: '#212125', // faint borders
          850: '#131315', // sidebar / secondary surface
          900: '#111113', // cards
          950: '#09090b', // app background
        },
      },
      fontFamily: {
        // Same type system as the marketing page, so product and site read as one brand.
        sans: ['Public Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Familjen Grotesk', 'Public Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 1px 0 rgb(2 6 23 / 0.04)',
        card: '0 1px 2px 0 rgb(2 6 23 / 0.05)',
        pop: '0 8px 32px -12px rgb(2 6 23 / 0.35)',
      },
      // Tightened: the old scale rounded xl/2xl/3xl to 14-22px, so every card,
      // input and button read as the same soft blob. rounded-full is untouched.
      borderRadius: {
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.875rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
