/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
        'brutal': ['Arial Black', 'sans-serif'],
      },
      colors: {
        'brutal': {
          'black': '#000000',
          'white': '#ffffff',
          'gray': '#808080',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000000',
        'brutal-lg': '8px 8px 0px 0px #000000',
        'brutal-xl': '12px 12px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      }
    },
  },
  plugins: [],
  darkMode: "class",
};
