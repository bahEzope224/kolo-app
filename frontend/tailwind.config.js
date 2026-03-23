/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "380px",
        sm: "480px",
        md: "768px",
        lg: "1024px",
      },
      colors: {
        kolo: {
          green: "#10B981",
          dark: "#065F46",
        },
      },
    },
  },
  plugins: [],
};

