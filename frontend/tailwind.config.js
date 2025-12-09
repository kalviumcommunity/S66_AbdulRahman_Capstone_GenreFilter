/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Custom color palette
        'dark': {
          'base': '#0a0a0a',
          'elevated': '#141414',
          'surface': '#1a1a1a',
          'hover': '#242424',
        },
        'spotify': {
          'green': '#1DB954',
          'green-hover': '#1ed760',
          'green-muted': 'rgba(29, 185, 84, 0.15)',
        },
        'custom': {
          'border': '#282828',
          'border-light': '#3a3a3a',
          'text-secondary': '#a1a1a1',
          'text-muted': '#6a6a6a',
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(29, 185, 84, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};