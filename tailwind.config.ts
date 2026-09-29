import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0a0e14",
        panel: "#111722",
        edge: "#1e2733",
      },
    },
  },
  plugins: [],
};

export default config;
