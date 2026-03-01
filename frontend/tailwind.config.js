/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#edfcff',
          100: '#d6f7ff',
          200: '#a6f1ff',
          300: '#5ce8ff',
          400: '#0dd5ff',
          500: '#00baee',
          600: '#0094c7',
          700: '#0075a1',
          800: '#005f84',
          900: '#064f6d',
        },
        neon: {
          cyan: '#00f5ff',
          green: '#00ff88',
          amber: '#ffb800',
          red: '#ff3860',
          purple: '#a855f7',
        },
        surface: {
          950: '#020817',
          900: '#0a0f1e',
          800: '#0f1629',
          700: '#162035',
          600: '#1e2d47',
          500: '#253656',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.3), 0 0 60px rgba(0, 245, 255, 0.1)',
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1)',
        'glow-red': '0 0 20px rgba(255, 56, 96, 0.3), 0 0 60px rgba(255, 56, 96, 0.1)',
        'glow-amber': '0 0 20px rgba(255, 184, 0, 0.3), 0 0 60px rgba(255, 184, 0, 0.1)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'ripple': 'ripple 1s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        ripple: {
          '0%': { 
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: '1',
          },
          '100%': { 
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: '0',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
