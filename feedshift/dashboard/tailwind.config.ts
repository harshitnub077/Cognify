import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Map Tailwind token names to CSS variables so classes like
        // text-primary, bg-primary/10, border-secondary etc. work
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        // Surface tokens
        accent: '#7c3aed',
        'accent-light': '#a78bfa',
        surface: '#111113',
        surface2: '#18181b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'in': 'fade-in 0.4s ease forwards',
        'slide-up': 'slide-in-from-bottom 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-down': 'slide-in-from-top 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
