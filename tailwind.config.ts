import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        skyy: {
          bg: '#000000',
          deep: '#100020',
          violet: '#8000F0',
          purple: '#C000F0',
          magenta: '#F000F0',
          pink: '#FF0080',
          blue: '#4000C0',
          text: '#F0F0F0',
          muted: '#999999',
          card: '#0a0a0a',
          surface: '#111111',
          border: '#000000',
        },
      },
      fontFamily: {
        sans: ['"BBH Bogle"', 'system-ui', 'sans-serif'],
        display: ['"BBH Bogle"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        minecraft: ['"BBH Bogle"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(128, 0, 240, 0.5)',
        'glow-pink': '0 0 20px -5px rgba(255, 0, 128, 0.5)',
        'glow-magenta': '0 0 20px -5px rgba(240, 0, 240, 0.5)',
      },
      backgroundImage: {
        'skyy-gradient':
          'linear-gradient(135deg, #8000F0, #C000F0, #F000F0)',
        'skyy-gradient-pink':
          'linear-gradient(135deg, #F000F0, #FF0080)',
        'skyy-gradient-subtle':
          'linear-gradient(135deg, rgba(128,0,240,0.15), rgba(192,0,240,0.1))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(128,0,240,0.4)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(240,0,240,0.6)' },
        },
        'gradient-move': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'gradient-move': 'gradient-move 8s ease-in-out infinite',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config
