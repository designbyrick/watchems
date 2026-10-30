import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Graphite palette — see design canvas "Graphite · Geist"
        canvas: '#F6F6F5',      // page background
        surface: '#FFFFFF',     // cards, inputs, menus
        subtle: '#EEEEEC',      // hover fills, skeletons, quiet chips
        line: {
          DEFAULT: '#E4E4E2',   // hairline borders and dividers
          strong: '#D2D2CF',
        },
        ink: {
          DEFAULT: '#161616',   // primary text and primary buttons
          hover: '#3A3A38',
        },
        muted: '#5A5A58',       // secondary text
        faint: '#767674',       // tertiary text, mono labels on white
        mark: '#C2410C',        // accent: small marks only (active tab, selected ring, logo tick)
        winner: '#16A34A',
        winnerBg: '#F0FDF4',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Geist', 'system-ui', 'sans-serif'],
        heading: ['var(--font-geist-sans)', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      letterSpacing: {
        display: '-0.043em', // 56px / -2.4px on the canvas H1
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.06)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 20px 40px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.25s ease-out forwards',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [typography],
};
export default config;
