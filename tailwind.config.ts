import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        navy: "#173b63",
        pine: "#0f5132",
        gold: "#b8872f",
        risk: "#c2410c"
      },
      boxShadow: {
        cockpit: "0 1px 2px rgba(16, 32, 51, 0.06), 0 8px 28px rgba(16, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
