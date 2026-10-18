import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  // La compresión de imágenes se hace en el navegador antes de subir; el
  // servidor solo necesita aceptar los adjuntos ya reducidos.
  // pdfkit (usado por @react-pdf/renderer) carga sus fuentes estándar con un
  // require dinámico que el tracer de Next no detecta, así que hay que forzar
  // su inclusión en el bundle de la función serverless o falla en producción
  // con "Cannot find module .../standard-fonts/Helvetica.cjs".
  outputFileTracingIncludes: {
    "/api/informes/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
  },
};

export default nextConfig;
