/** @type {import('tailwindcss').Config} */
// ============================================================
//  Tailwind 配置：圆角药丸 + 纯黑白双主题（零彩色）
//  沿用 PLinstaller/style 的 Pill Design
// ============================================================
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],

  theme: {
    extend: {
      borderRadius: {
        pill: '9999px',
        soft: '1rem',
        softer: '1.5rem',
        softest: '2rem',
      },

      colors: {
        primary: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
          400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
          800: '#27272a', 900: '#18181b', 950: '#0a0a0a',
        },
        ink: {
          DEFAULT: '#000000', paper: '#ffffff',
          soft: '#111111', hard: '#f0f0f0',
        },
      },

      boxShadow: {
        'pill':        '0 2px 10px -3px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)',
        'pill-hover':  '0 12px 32px -8px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
        'pill-active': '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.15)',
        'card':        '0 6px 24px -8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':  '0 18px 50px -14px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.05)',
        'soft':        '0 2px 12px -4px rgba(0,0,0,0.06)',
      },

      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },

      transitionDuration: { DEFAULT: '220ms', PILL: '280ms' },
      transitionTimingFunction: { PILL: 'cubic-bezier(0.4, 0, 0.2, 1)' },

      backgroundColor: {
        'gradient-pill': '#0a0a0a',
        'gradient-pill-dark': '#fafafa',
      },
    },
  },

  plugins: [
    function ({ addUtilities, addComponents, theme }) {
      addUtilities({
        '.pill-base': {
          borderRadius: '9999px',
          transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
        },
        '.pill-btn': {
          borderRadius: '9999px',
          padding: '0.625rem 1.5rem',
          fontWeight: 500,
          transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          outline: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        },
        '.pill-input': {
          borderRadius: '9999px',
          padding: '0.625rem 1.25rem',
          transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          border: '1px solid transparent',
        },
        '.pill-card': {
          borderRadius: '1.5rem',
          padding: '1.5rem',
          transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: '#ffffff',
          boxShadow: theme('boxShadow.card'),
        },
        '.dark .pill-card': {
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      }, ['responsive', 'hover', 'active', 'focus']);

      addComponents({
        '.pill-variant-primary': {
          background: '#0a0a0a', color: '#ffffff', boxShadow: theme('boxShadow.pill'),
          '&:hover': { boxShadow: theme('boxShadow.pill-hover'), transform: 'translateY(-1px)' },
          '&:active': { boxShadow: theme('boxShadow.pill-active'), transform: 'translateY(0)' },
        },
        '.dark .pill-variant-primary': { background: '#fafafa', color: '#000000' },
        '.pill-variant-ghost': {
          background: 'transparent', color: '#27272a', border: '1px solid #e4e4e7',
          '&:hover': { background: '#f4f4f5' },
        },
        '.dark .pill-variant-ghost': {
          color: '#e4e4e7', border: '1px solid #3f3f46',
          '&:hover': { background: '#27272a' },
        },
        '.pill-variant-soft': {
          background: '#f4f4f5', color: '#18181b', border: '1px solid #e4e4e7',
          '&:hover': { background: '#e4e4e7' },
        },
        '.dark .pill-variant-soft': {
          background: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46',
          '&:hover': { background: '#27272a' },
        },
        '.pill-variant-danger': {
          background: '#000000', color: '#ffffff', border: '1px solid #000000',
          boxShadow: theme('boxShadow.pill'),
          '&:hover': { transform: 'translateY(-1px)', boxShadow: theme('boxShadow.pill-hover') },
        },
        '.dark .pill-variant-danger': { background: '#ffffff', color: '#000000', border: '1px solid #ffffff' },
      });
    },
  ],

  corePlugins: { preflight: true },
};
