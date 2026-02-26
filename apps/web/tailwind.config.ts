import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"]
      },
      colors: {
        ink: {
          950: "#0A0E1A",
          900: "#111A2E",
          800: "#1D2944",
          700: "#2A3A5E",
          200: "#CBD6EA",
          100: "#E5ECF7"
        },
        mint: {
          500: "#2CD5A4",
          400: "#52E3BA",
          100: "#D6F8EE"
        },
        coral: {
          500: "#EE6A5D",
          100: "#FDE2DE"
        },
        amber: {
          500: "#F2B84B",
          100: "#FCEECF"
        }
      },
      boxShadow: {
        panel: "0 14px 36px rgba(10,14,26,0.08)",
        soft: "0 6px 24px rgba(10,14,26,0.06)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(17,26,46,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,26,46,0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
