/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist Variable', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Geist Variable', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
