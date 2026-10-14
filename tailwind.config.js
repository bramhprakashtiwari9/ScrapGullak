/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gullak: { DEFAULT: '#10B981', dark: '#047857', soft: '#ECFDF5' }, // Gullak Emerald Green
        trust: { DEFAULT: '#0F172A', soft: '#1E293B' },                    // Trust Slate
        coin: { DEFAULT: '#F59E0B', dark: '#B45309', soft: '#FEF3C7' },     // Warm Gold / Coin accent
        paper: '#F5F8F6',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Hind', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        'coin-drop': {
          '0%': { transform: 'translateY(-46px)', opacity: '0' },
          '15%': { opacity: '1' },
          '70%': { transform: 'translateY(6px)', opacity: '1' },
          '100%': { transform: 'translateY(14px)', opacity: '0' },
        },
        'toast-in': { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      animation: {
        'coin-drop': 'coin-drop 2.4s ease-in infinite',
        'toast-in': 'toast-in .25s ease-out',
      },
    },
  },
  plugins: [],
};
