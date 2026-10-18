import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { buscarUsuarioPorEmail } from "./usuarios";
import { obtenerParametro } from "./configuracion";
import { ErrorAplicacion } from "./permissions";
import { ROLES } from "./constants";
import type { Usuario } from "./types";

// Equivalente a getUsuarioActual_ de Auth.gs: NextAuth certifica la identidad
// (login de Google), pero el permiso real se revalida contra la hoja en cada
// petición, para que un ADMIN pueda desactivar a alguien o bloquear el acceso
// al instante sin esperar a que caduque una sesión.
export async function obtenerUsuarioActual(opciones: { permitirCambioPassword?: boolean } = {}): Promise<Usuario> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    throw new ErrorAplicacion("ACCESO_NO_AUTORIZADO", "Inicie sesión para continuar.");
  }
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario || !usuario.activo) {
    throw new ErrorAplicacion("ACCESO_NO_AUTORIZADO", "Esta cuenta no está autorizada para acceder a la aplicación.");
  }
  if (!session.user.expiraAcceso || session.user.expiraAcceso <= Date.now() ||
      (session.user.versionSesion || "") !== (usuario.version_sesion || "")) {
    throw new ErrorAplicacion("ACCESO_NO_AUTORIZADO", "La sesión ha caducado. Vuelva a iniciar sesión.");
  }
  if (usuario.cambio_password_obligatorio && !opciones.permitirCambioPassword) {
    throw new ErrorAplicacion("CAMBIO_PASSWORD_OBLIGATORIO", "Debe cambiar su contraseña para continuar.");
  }
  if (usuario.rol !== ROLES.ADMIN) {
    const bloqueado = await obtenerParametro("ACCESO_BLOQUEADO", "FALSE");
    if (bloqueado === "TRUE") {
      throw new ErrorAplicacion("ACCESO_NO_AUTORIZADO", "El acceso está temporalmente bloqueado por el administrador.");
    }
  }
  return usuario;
}
