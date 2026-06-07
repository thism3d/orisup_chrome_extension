import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ob: {
          primary: "#C6E300",
          "primary-hover": "#A8C200",
          "primary-soft": "#EEF8A6",
          black: "#0B0B0B",
          body: "#333333",
          muted: "#777777",
          surface: "#FFFFFF",
          section: "#F7F7F7",
          footer: "#0B0B0B",
          border: "#E5E5E5",
          focus: "#C6E300",
          placeholder: "#9CA3AF",
          discount: "#C6E300",
          "old-price": "#9CA3AF",
          success: "#22C55E",
          error: "#EF4444",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Roboto",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
} satisfies Config;
