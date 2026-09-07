import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Vite no vuelca el .env en process.env para este archivo: hay que cargarlo a mano. El
  // tercer argumento vacío incluye las variables sin prefijo VITE_, que es lo que interesa
  // aquí porque el destino del proxy nunca llega al navegador.
  const entorno = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      // En desarrollo el front corre aparte y /api se reenvía al API. Al pasar por el proxy,
      // el navegador lo ve como mismo origen y no entra CORS en juego.
      proxy: {
        "/api": {
          target: entorno.VITE_API_PROXY || "http://localhost:5234",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
