/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px #ef4444, 0 0 10px #ef4444' },
          '50%': { boxShadow: '0 0 20px #ef4444, 0 0 30px #f87171' },
        },
        'pulse-green': {
          '0%, 100%': {
            boxShadow: '0 0 8px #10b981, 0 0 12px #10b981',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 24px #10b981, 0 0 36px #34d399',
            transform: 'scale(1.02)',
          },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'pulse-green': 'pulse-green 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s ease-in-out infinite',
        ticker: 'ticker 30s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
