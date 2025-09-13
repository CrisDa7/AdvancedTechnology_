/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sapphire: {
          '50': '#f1f7fd',
          '100': '#dfedfa',
          '200': '#c7dff6',
          '300': '#a0cbf0',
          '400': '#74aee6',
          '500': '#5390de',
          '600': '#3e75d2',
          '700': '#3561c0',
          '800': '#2f4e98',
          '900': '#2c467c',
          '950': '#1f2c4c',
        },
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [], // ✅ vacío si no instalas @tailwindcss/forms
}
