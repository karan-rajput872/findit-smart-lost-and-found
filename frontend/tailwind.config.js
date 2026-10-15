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
        findit: {
          bg: '#0B0D12',
          sidebar: '#11151D',
          card: '#171C27',
          'card-hover': '#1F2636',
          border: '#242C3F',
          'border-light': '#2F3952',
          primary: '#8B7CFF',
          'primary-hover': '#7A68FA',
          'primary-light': '#A79CFF',
          secondary: '#36CFC9',
          'secondary-hover': '#2BB8B2',
          text: '#F5F6FA',
          muted: '#9299A8',
          subtle: '#626B7F',
          lost: '#FF6B6B',
          found: '#36CFC9',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(139, 124, 255, 0.35)',
        'glow-secondary': '0 0 25px -5px rgba(54, 207, 201, 0.35)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
