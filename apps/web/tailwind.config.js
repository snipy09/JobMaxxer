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
          'system-ui',
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
        powder: {
          50: '#f0f7ff',
          100: '#e0f0fe',
          200: '#bae2fd',
          300: '#7cc9fa',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#041827',
        },
        ink: {
          950: '#000000',
          900: '#09090b',
          850: '#121215',
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
        },
        apple: {
          canvas: '#fbfbfd',
          subtle: '#f5f5f7',
          border: '#d2d2d7',
          card: '#ffffff',
          darkCard: '#1d1d1f',
          text: '#1d1d1f',
          secondary: '#86868b',
          link: '#0071e3',
        },
      },
    },
  },
  plugins: [],
}
