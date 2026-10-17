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
          bg: '#F8F6F0',              // Main warm background
          card: '#FFFFFF',            // Primary card background
          'card-hover': '#FAF8F4',    // Soft card hover
          surface: '#FFFFFF',         // White surface
          secondary_bg: '#EFE9DD',    // Secondary background: #EFE9DD
          sidebar: '#F4F0E8',         // Sidebar warm beige
          border: '#E7E1D6',          // Muted warm borders
          'border-light': '#F0EBE1',
          primary: '#6F8B74',         // Primary accent: Muted sage green
          'primary-hover': '#5E7763',
          'primary-light': '#8DA592',
          'primary-subtle': '#EBF1EC',
          secondary: '#6F8B74',       // Replaced neon cyan with cohesive sage green
          'secondary-hover': '#5E7763',
          text: '#26332B',            // Primary text: Deep readable charcoal
          muted: '#77766F',           // Secondary text: Warm grey-charcoal
          subtle: '#9C9B94',          // Subtle labels and captions
          // Semantic status tones with muted warm palettes
          lost: '#C25E54',            // Muted coral/terracotta for lost
          'lost-bg': '#F6E5E2',       // Muted error/lost background
          found: '#4E7A5A',           // Muted sage/forest for found
          'found-bg': '#E5EFE6',      // Muted success/found background
          success: '#4E7A5A',         // Muted success text
          'success-bg': '#E5EFE6',    // Muted success background
          warning: '#996B26',         // Muted warning text
          'warning-bg': '#F7EBD7',    // Muted warning background
          danger: '#B8453D',          // Muted danger text
          'danger-bg': '#F6E5E2',     // Muted error background
          info: '#5B798A',            // Muted steel info text
          'info-bg': '#E8F0F3',       // Muted info background
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(38, 51, 43, 0.05)',
        'card': '0 2px 8px -2px rgba(38, 51, 43, 0.06), 0 1px 3px -1px rgba(38, 51, 43, 0.04)',
        'card-hover': '0 10px 20px -5px rgba(38, 51, 43, 0.08), 0 2px 6px -2px rgba(38, 51, 43, 0.04)',
        'glow-primary': '0 4px 14px rgba(111, 139, 116, 0.22)',
        'glow-secondary': '0 4px 14px rgba(111, 139, 116, 0.22)',
      }
    },
  },
  plugins: [],
}
