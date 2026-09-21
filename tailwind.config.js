/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0A",
        elevated: "#121212",
        card: "#181818",
        cardhover: "#232323",
        border: "#282828",
        accent: "#1DB954",
        accentsoft: "rgba(29,185,84,0.12)",
        ptext: "#FFFFFF",
        muted: "#A7A7A7",
        danger: "#F15E6C",
      },
      fontFamily: {
        display: ["'Inter'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      keyframes: {
        floatin: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseline: {
          "0%, 100%": { opacity: 0.4 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        floatin: "floatin 0.2s ease-out",
        pulseline: "pulseline 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
