/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Water / brand ramp
        brand: {
          50: '#EAF6FB',
          100: '#D0EBF6',
          200: '#A6D7ED',
          300: '#6BBADE',
          400: '#3898C9',
          500: '#1E7BAE',
          600: '#0369A1',
          700: '#025482',
          800: '#06476B',
          900: '#0A3B5C',
          950: '#072A44',
        },
        // Secondary — deep navy
        ink: {
          50: '#F5F7FA',
          100: '#E9EEF4',
          200: '#CBD6E4',
          300: '#9DB0C9',
          400: '#6B86A8',
          500: '#46658C',
          600: '#324F73',
          700: '#243D5C',
          800: '#182B45',
          900: '#0E1C30',
          950: '#08111F',
        },
        // Accent — aqua
        aqua: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        // Risk
        risk: {
          low: '#10B981',
          moderate: '#F59E0B',
          high: '#F97316',
          severe: '#DC2626',
          extreme: '#7F1D1D',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(56, 152, 201, 0.5)',
        card: '0 1px 2px rgba(14,28,48,0.06), 0 8px 24px -8px rgba(14,28,48,0.12)',
        'card-lg': '0 4px 12px rgba(14,28,48,0.08), 0 24px 48px -12px rgba(14,28,48,0.18)',
      },
      backgroundImage: {
        'water-grid': 'radial-gradient(circle at 50% 50%, rgba(56,152,201,0.18) 0%, transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(56,152,201,0.45)' },
          '70%': { boxShadow: '0 0 0 18px rgba(56,152,201,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(56,152,201,0)' },
        },
        drift: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
        ripple: 'ripple 2s ease-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        drift: 'drift 5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
