/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6C4FF6',
        accent: '#00C9A7',
        background: {
          light: '#f8fafc',
          dark: '#0f172a'
        },
        surface: {
          light: '#ffffff',
          dark: '#1e293b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
      }
    },
  },
  plugins: [],
}
