/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Beacon amber — the marketing page's accent, so product and site match.
        // 500 is the landing page --signal, 400 its dark-mode value, 700 its
        // --signal-ink, 50 its --signal-soft.
        brand: {
          50: '#fbeee3',
          100: '#f7dcc6',
          200: '#efbe95',
          300: '#e8a068',
          400: '#e8934a', // accent on dark grounds
          500: '#c2621b', // primary
          600: '#ad5617',
          700: '#984a10',
          800: '#7a3b0d',
          900: '#5e2e0a',
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
        // Cool blue-slate dark surfaces, matching the marketing page's ground
        // (--paper / --surface / --sunk / --rule). Light shades come from
        // Tailwind's own slate, which is already cool.
        slate: {
          700: '#333e49', // --rule-firm, subtle hover surface
          750: '#2a343e',
          800: '#232c35', // --rule, faint borders
          850: '#111820', // --sunk, sidebar / secondary surface
          900: '#151c24', // --surface, cards
          950: '#0e1319', // --paper (dark), app background
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
