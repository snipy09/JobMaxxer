/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Geist"',
          '"Inter"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          '"Geist Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        ink: {
          950: '#000000',
          900: '#09090b',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
          50: '#fafafa',
          0: '#ffffff',
        }
      },
      boxShadow: {
        'fine': '0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'lifted': '0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'float': '0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        'dark-fine': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 2px 10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
