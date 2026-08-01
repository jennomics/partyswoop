import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    borderRadius: {
      DEFAULT: '0',
      none: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px',
    },
    extend: {
      colors: {
        paper: '#F6F5F1',
        rule: '#E6E4DC',
        live: '#A8512C',
        ink: '#1C1C1A',
        'ink-72': 'rgb(28 28 26 / .72)',
        'ink-50': 'rgb(28 28 26 / .50)',
        'ink-35': 'rgb(28 28 26 / .35)',
        'live-wash': '#F1E6E0',
      },
      spacing: {
        's-1': '8px',
        's-2': '16px',
        's-3': '24px',
        's-4': '40px',
        's-5': '64px',
        's-6': '104px',
      },
      fontFamily: {
        zen: ['var(--font-zen)', 'Zen Kaku Gothic New', 'sans-serif'],
        mono: ['var(--font-mono)', 'DM Mono', 'monospace'],
      },
      fontSize: {
        display: ['76px', { lineHeight: '1.1' }],
        h1: ['42px', { lineHeight: '1.2' }],
        h2: ['30px', { lineHeight: '1.3' }],
        h3: ['24px', { lineHeight: '1.4' }],
        body: ['16px', { lineHeight: '27px' }],
        list: ['15px', { lineHeight: '21px' }],
        meta: ['11px', { lineHeight: '18px' }],
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
