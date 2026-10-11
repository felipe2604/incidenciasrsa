import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La compresión de imágenes se hace en el navegador antes de subir; el
  // servidor solo necesita aceptar los adjuntos ya reducidos.
};

export default nextConfig;
