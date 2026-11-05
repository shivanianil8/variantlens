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
        navy: {
          950: '#070C18',
          900: '#0B1120',
          850: '#0F172A',
          800: '#131C2E',
          750: '#172338',
          700: '#1E293B',
          600: '#334155',
          500: '#475569',
        },
        accent: {
          cyan: '#06B6D4',
          'cyan-bright': '#22D3EE',
          teal: '#14B8A6',
          'teal-bright': '#2DD4BF',
          sky: '#0284C7',
        },
        bio: {
          pathogenic: '#F43F5E',
          'likely-pathogenic': '#FB7185',
          benign: '#10B981',
          'likely-benign': '#34D399',
          vus: '#F59E0B',
          conflicting: '#F97316',
          neutral: '#64748B',
        },
        plddt: {
          'very-high': '#0C53B7',
          confident: '#5BC0DE',
          low: '#F0AD4E',
          'very-low': '#D9534F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
