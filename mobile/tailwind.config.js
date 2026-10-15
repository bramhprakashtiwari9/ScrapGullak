/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only (app.json userInterfaceStyle). 'class' stops NativeWind on web from
  // erroring when the color scheme is set manually ("dark mode is type 'media'").
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gullak: { DEFAULT: '#10B981', dark: '#047857', soft: '#ECFDF5' },
        trust: { DEFAULT: '#0F172A', soft: '#1E293B' },
        coin: { DEFAULT: '#F59E0B', dark: '#B45309', soft: '#FEF3C7' },
        paper: '#F5F8F6',
      },
    },
  },
  plugins: [],
};
