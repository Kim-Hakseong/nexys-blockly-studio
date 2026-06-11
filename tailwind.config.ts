import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        border: 'hsl(var(--border))',
        text: 'hsl(var(--text))',
        'text-muted': 'hsl(var(--text-muted))',
        signal: 'hsl(var(--signal))',
        warn: 'hsl(var(--warn))',
        alarm: 'hsl(var(--alarm))',
        info: 'hsl(var(--info))',
        workspace: 'hsl(var(--workspace))',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        condensed: ['"IBM Plex Sans Condensed"', '"IBM Plex Sans"', 'sans-serif'],
      },
      letterSpacing: {
        overline: '0.06em',
      },
      keyframes: {
        'pulse-signal': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 hsl(var(--signal) / 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 4px hsl(var(--signal) / 0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-signal': 'pulse-signal 2s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
