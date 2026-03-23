/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui"],
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
