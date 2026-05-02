/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#7B2D26',
          50: '#F8EFEE',
          100: '#EBD0CD',
          200: '#D69E99',
          300: '#BF6D65',
          400: '#9E4138',
          500: '#7B2D26',
          600: '#62241E',
          700: '#491B17',
          800: '#30120F',
          900: '#180908',
        },
        ink: {
          DEFAULT: '#1F1A17',
          muted: '#5C534D',
          subtle: '#9A9089',
        },
        parchment: {
          DEFAULT: '#FAF7F2',
          warm: '#F5F0E6',
          edge: '#E8E1D3',
        },
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
