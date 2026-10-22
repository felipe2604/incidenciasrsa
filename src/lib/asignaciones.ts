import { HOJAS } from "./constants";
import { leerFilasComoObjetos } from "./sheets";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import type { Usuario } from "./types";

export interface UsuarioAsignable { email: string; nombre: string }

export async function listarUsuariosAsignables(actor: Usuario): Promise<UsuarioAsignable[]> {
  verificarPermiso(actor, "INCIDENCIAS_CREAR");
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  return datos.filas.filter(({ objeto }) => objeto.activo === true || objeto.activo === "TRUE" || objeto.activo === "VERDADERO")
    .map(({ objeto }) => ({ email: String(objeto.email || "").toLowerCase().trim(), nombre: String(objeto.nombre || objeto.email || "") }))
    .filter((usuario) => !!usuario.email)
    .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, "es"));
}

export async function resolverResponsable(actor: Usuario, email?: string) {
  const correo = email?.toLowerCase().trim();
  if (!correo || correo === actor.email.toLowerCase().trim()) return { id: actor.id_usuario, email: actor.email, nombre: actor.nombre };
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  const coincidencias = datos.filas.filter(({ objeto }) => String(objeto.email || "").toLowerCase().trim() === correo);
  const usuario = coincidencias.length === 1 ? coincidencias[0].objeto : null;
  if (!usuario?.id_usuario || !(usuario.activo === true || usuario.activo === "TRUE" || usuario.activo === "VERDADERO")) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Seleccione una persona activa para asignar la incidencia.", { responsableEmail: "Responsable no disponible." });
  }
  return { id: String(usuario.id_usuario), email: correo, nombre: String(usuario.nombre || correo) };
}