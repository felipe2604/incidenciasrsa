export { default } from "next-auth/middleware";

// Exige sesión de Google válida para todo lo de /incidencias/*; el control de
// permisos/ámbito fino se revalida además en cada API route y server component.
export const config = {
  matcher: ["/incidencias/:path*"],
};
