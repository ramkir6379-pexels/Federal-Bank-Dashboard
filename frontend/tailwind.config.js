/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f7f9fb',
        primary: '#003d9b',
        'primary-container': '#0052cc',
        'primary-fixed': '#dae2ff',
        secondary: '#006c49',
        'secondary-container': '#6cf8bb',
        tertiary: '#603b00',
        'tertiary-fixed-dim': '#ffb95f',
        surface: '#f7f9fb',
        'surface-container-low': '#f2f4f6',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'surface-container-lowest': '#ffffff',
        outline: '#737685',
        'outline-variant': '#c3c6d6',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434654',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 12px 40px rgba(25, 28, 30, 0.06)',
      }
    },
  },
  plugins: [],
}
