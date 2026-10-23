/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060D18',
        surface: {
          DEFAULT: '#0D1728',
          light: '#16233A',
          dark: '#0A1424',
          card: '#0F1B2E',
        },
        border: {
          DEFAULT: '#1C2A42',
          subtle: '#152238',
          accent: '#2B3B57',
        },
        primary: {
          DEFAULT: '#8DFF90',
          hover: '#6EE87A',
          light: '#B9FF9D',
          dark: '#1F6B3A',
          dim: 'rgba(141, 255, 144, 0.12)',
        },
        warning: {
          DEFAULT: '#FFD166',
          hover: '#F0B93A',
          dim: 'rgba(255, 209, 102, 0.14)',
        },
        danger: {
          DEFAULT: '#FF6B8A',
          hover: '#F04A6E',
          dim: 'rgba(255, 107, 138, 0.14)',
        },
        text: {
          primary: '#F4F7F5',
          secondary: '#A6B6CC',
          muted: '#71839D',
        },
        mint: {
          DEFAULT: '#B9FF9D',
          deep: '#7CF07A',
        },
        lilac: {
          DEFAULT: '#DCC8FF',
          deep: '#B99CFF',
        },
        sky: {
          DEFAULT: '#BEE9FF',
          deep: '#7FCDF4',
        },
        blush: {
          DEFAULT: '#FFC6DE',
          deep: '#F79BC3',
        },
        lime: {
          DEFAULT: '#8DFF90',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'card': '22px',
        'pill': '999px',
      },
      boxShadow: {
        card: '0 24px 60px -36px rgba(0, 0, 0, 0.9)',
        glow: '0 0 30px -8px rgba(141, 255, 144, 0.55)',
        'glow-emerald': '0 0 24px -6px rgba(141, 255, 144, 0.4)',
        'glow-amber': '0 0 24px -6px rgba(255, 209, 102, 0.4)',
        'glow-danger': '0 0 24px -6px rgba(255, 107, 138, 0.4)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-7px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
