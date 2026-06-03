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
        primary: '#7C3AED', // Deeper vivid purple
        accent: '#38BDF8',  // Neon blue
        background: {
          light: '#f8fafc',
          dark: '#0f0f13' // Deeper dark mode
        },
        surface: {
          light: '#ffffff',
          dark: '#1a1a24' // Tinted dark surface
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
      }
    },
  },
  plugins: [],
}
