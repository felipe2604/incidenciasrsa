import type { Config } from "tailwindcss";

// Misma paleta Coolors "reds/oranges" usada en la app de Apps Script, reordenada
// para que los tonos claros aparezcan primero en gráficas con pocos datos.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          950: "#03071e",
          900: "#370617",
          800: "#6a040f",
          700: "#9d0208",
          600: "#d00000",
          500: "#dc2f02",
          400: "#e85d04",
          300: "#f48c06",
          200: "#faa307",
          100: "#ffba08",
        },
      },
    },
  },
  plugins: [],
};

export default config;
