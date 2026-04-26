import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.tsx", "./components/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"]
      },
      colors: {
        gold: "#C9A84C",
        "gold-light": "#F0D98A",
        surface: "#111111",
        "surface-2": "#161616",
        "surface-3": "#1E1E1E",
        border: "#222222"
      },
      borderRadius: {
        DEFAULT: "10px"
      }
    }
  },
  plugins: []
};

export default config;
