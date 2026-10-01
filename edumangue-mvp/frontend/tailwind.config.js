/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mare: '#EDF1EA',      // fundo: areia de maré
        raiz: '#1E2A25',      // texto principal
        lama: '#6C5D49',      // texto secundário / neutros quentes
        mangue: { DEFAULT: '#1D6B56', dark: '#134D3E', light: '#DCEBE4' },
        sol: { DEFAULT: '#E0AE38', light: '#FBF1D3' },
        caranguejo: { DEFAULT: '#C24632', light: '#F8E1DC' },
        linha: '#D5DCD2',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
