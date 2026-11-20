import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        vault: {
          bg: "#0B0C0F",
          card: "#121318",
          cardInner: "#181A21",
          pill: "#1E2029",
          border: "rgba(255, 255, 255, 0.07)",
          blue: "#2563EB",
          blueLight: "#3B82F6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
