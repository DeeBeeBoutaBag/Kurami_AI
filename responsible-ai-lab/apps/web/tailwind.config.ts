import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#050507",
        ink: "#0A0B0E",
        ivory: "#F7F2E8",
        gold: "#F6C945",
        emerald: "#38E6A1",
        purple: "#A08CFF",
        coral: "#FF7B6F",
        teal: "#79F5E8",
        burgundy: "#141013",
        wolf: "#8B929D"
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(246, 201, 69, 0.38)"
      }
    }
  },
  plugins: []
} satisfies Config;
