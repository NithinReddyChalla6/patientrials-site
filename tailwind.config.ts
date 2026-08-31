import type { Config } from 'tailwindcss'

/**
 * Tokens live in src/styles/globals.css as RGB channel triplets; this file only
 * maps them to utilities. Changing a colour is a one-line change in the CSS,
 * never a sweep across components.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: rgb('background'),
        foreground: rgb('foreground'),
        sunken: rgb('sunken'),
        card: { DEFAULT: rgb('card'), foreground: rgb('card-foreground') },
        popover: { DEFAULT: rgb('popover'), foreground: rgb('popover-foreground') },
        primary: { DEFAULT: rgb('primary'), foreground: rgb('primary-foreground') },
        secondary: { DEFAULT: rgb('secondary'), foreground: rgb('secondary-foreground') },
        brand: { DEFAULT: rgb('brand'), foreground: rgb('brand-foreground') },
        cta: { DEFAULT: rgb('cta'), foreground: rgb('cta-foreground') },
        muted: { DEFAULT: rgb('muted'), foreground: rgb('muted-foreground') },
        accent: { DEFAULT: rgb('accent'), foreground: rgb('accent-foreground') },
        destructive: { DEFAULT: rgb('destructive'), foreground: rgb('destructive-foreground') },
        success: { DEFAULT: rgb('success'), foreground: rgb('success-foreground') },
        warning: { DEFAULT: rgb('warning'), foreground: rgb('warning-foreground') },
        info: { DEFAULT: rgb('info'), foreground: rgb('info-foreground') },
        border: rgb('border'),
        input: rgb('input'),
        ring: rgb('ring'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 2px)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 2px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      boxShadow: {
        // Panels sit on hairlines, not on shadow. Depth is for things that
        // genuinely float above the page.
        sm: '0 1px 2px 0 rgb(17 24 39 / 0.04)',
        DEFAULT: '0 1px 2px 0 rgb(17 24 39 / 0.05)',
        md: '0 4px 10px -2px rgb(17 24 39 / 0.08)',
        lg: '0 16px 40px -12px rgb(17 24 39 / 0.20), 0 4px 10px -4px rgb(17 24 39 / 0.08)',
      },
      spacing: {
        'row-condensed': 'var(--row-condensed)',
        'row-regular': 'var(--row-regular)',
        'row-relaxed': 'var(--row-relaxed)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(4px)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 120ms ease-in',
        'slide-up': 'slide-up 180ms ease-out',
        'slide-down-out': 'slide-down-out 120ms ease-in',
        'slide-in-left': 'slide-in-left 200ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
