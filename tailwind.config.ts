import type { Config } from "tailwindcss";

/**
 * Design tokens for the Tunisian Automotive Sources Portal.
 * Dark mode is the default (class strategy) because most users browse
 * from phones inside garages with low ambient light.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — deep garage blue (#1a2332 at DEFAULT)
        primary: {
          DEFAULT: "#1a2332",
          50: "#f3f6fa",
          100: "#e3eaf3",
          200: "#c2d0e2",
          300: "#93aac7",
          400: "#5f7fa4",
          500: "#3f5f85",
          600: "#2e4a6b",
          700: "#243a54",
          800: "#1a2332",
          900: "#111827",
          950: "#0b101a",
        },
        // Accent — safety orange (#f59e0b)
        accent: {
          DEFAULT: "#f59e0b",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Semantic surfaces
        background: "#0f1115",
        surface: {
          DEFAULT: "#1a1d23",
          raised: "#20242c",
          sunken: "#14171c",
        },
        line: "#2a2f3a",
        foreground: "#ffffff",
        muted: "#9ca3af",
        "muted-strong": "#cbd5e1",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
      },
      fontFamily: {
        sans: [
          "var(--font-cairo)",
          "var(--font-inter)",
          "Segoe UI",
          "Tahoma",
          "sans-serif",
        ],
        display: [
          "var(--font-cairo)",
          "var(--font-inter)",
          "Segoe UI",
          "Tahoma",
          "sans-serif",
        ],
      },
      maxWidth: {
        page: "76rem",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px -24px rgba(0,0,0,0.8)",
        "accent-glow": "0 0 0 1px rgba(245,158,11,0.25), 0 12px 40px -12px rgba(245,158,11,0.35)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0) 70%)",
        "blue-glow":
          "radial-gradient(50% 50% at 80% 20%, rgba(63,95,133,0.22) 0%, rgba(15,17,21,0) 70%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
