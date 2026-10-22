/**
 * Autorización por rol y ámbito — puerto directo de Autorizacion.gs.
 * Se comprueba SIEMPRE en el servidor (API routes / server actions); el
 * cliente solo oculta botones por comodidad, nunca es la barrera real.
 */
import { TIPO_UBICACION } from "./constants";
import type { Incidencia, Usuario } from "./types";

export const PERMISOS_POR_ROL: Record<string, string[]> = {
  ADMIN: ["*"],
  ADMINISTRADOR_FINCAS: [
    "INCIDENCIAS_VER_TODAS",
    "INCIDENCIAS_CREAR",
    "INCIDENCIAS_EDITAR_PROPIO_AMBITO",
    "INCIDENCIAS_CAMBIAR_ESTADO_PROPIAS",
    "COMENTARIOS_CREAR",
    "ARCHIVOS_SUBIR",
    "INFORMES_VER",
  ],
  PRESIDENTE: [
    "USUARIOS_ESTADISTICAS_VER",
    "INCIDENCIAS_VER_TODAS",
    "INCIDENCIAS_CREAR",
    "INCIDENCIAS_EDITAR",
    "INCIDENCIAS_ASIGNAR",
    "INCIDENCIAS_CAMBIAR_ESTADO",
    "INCIDENCIAS_VALIDAR_CIERRE",
    "ACTUACIONES_CREAR",
    "COMENTARIOS_CREAR",
    "ARCHIVOS_SUBIR",
    "INFORMES_VER",
    "AUDITORIA_VER",
  ],
  VOCAL: [
    "INCIDENCIAS_VER_AMBITO",
    "INCIDENCIAS_CREAR",
    "INCIDENCIAS_EDITAR_PROPIO_AMBITO",
    "ACTUACIONES_CREAR",
    "COMENTARIOS_CREAR",
    "ARCHIVOS_SUBIR",
  ],
  COORDINADOR: [
    "INCIDENCIAS_VER_AMBITO",
    "INCIDENCIAS_CREAR",
    "INCIDENCIAS_EDITAR_PROPIO_AMBITO",
    "ACTUACIONES_CREAR",
    "COMENTARIOS_CREAR",
    "ARCHIVOS_SUBIR",
  ],
};

export class ErrorAplicacion extends Error {
  codigo: string;
  errores?: Record<string, string>;
  constructor(codigo: string, mensaje: string, errores?: Record<string, string>) {
    super(mensaje);
    this.name = "ErrorAplicacion";
    this.codigo = codigo;
    this.errores = errores;
  }
}

export function tienePermiso(usuario: Usuario, permiso: string): boolean {
  const permisos = PERMISOS_POR_ROL[usuario.rol] || [];
  return permisos.includes("*") || permisos.includes(permiso);
}

export function verificarPermiso(usuario: Usuario, permiso: string): void {
  if (!tienePermiso(usuario, permiso)) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene permisos para realizar esta operación.");
  }
}

export function esCreador(usuario: Usuario, incidencia: Pick<Incidencia, "usuario_creador" | "usuario_creador_email">): boolean {
  return incidencia.usuario_creador_email ? incidencia.usuario_creador_email.toLowerCase().trim() === usuario.email.toLowerCase().trim() :
    usuario.id_unico !== false && incidencia.usuario_creador === usuario.id_usuario;
}

export function esResponsable(usuario: Usuario, incidencia: Pick<Incidencia, "responsable" | "responsable_email">): boolean {
  return incidencia.responsable_email ? incidencia.responsable_email.toLowerCase().trim() === usuario.email.toLowerCase().trim() :
    !!incidencia.responsable && usuario.id_unico !== false && incidencia.responsable === usuario.id_usuario;
}

export function puedeCambiarEstado(usuario: Usuario, usuarioCreador: string, correoCreador?: string): boolean {
  return tienePermiso(usuario, "INCIDENCIAS_CAMBIAR_ESTADO") ||
    (tienePermiso(usuario, "INCIDENCIAS_CAMBIAR_ESTADO_PROPIAS") && esCreador(usuario, { usuario_creador: usuarioCreador, usuario_creador_email: correoCreador }));
}

export function listaAmbito(valor: string | undefined | null): string[] {
  if (!valor) return [];
  return String(valor)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function usuarioTieneAmbitoTotal(usuario: Usuario, tipo: "BLOQUE" | "ZONA"): boolean {
  const lista = tipo === "BLOQUE" ? listaAmbito(usuario.ambito_bloques) : listaAmbito(usuario.ambito_zonas);
  return lista.includes("*");
}

// Verificación de ámbito por incidencia: se repite en cada lectura/escritura,
// nunca se confía en que el cliente ya filtró correctamente.
export function incidenciaEnAmbito(usuario: Usuario, incidencia: Incidencia): boolean {
  if (tienePermiso(usuario, "INCIDENCIAS_VER_TODAS")) return true;
  if (esResponsable(usuario, incidencia)) return true;
  if (incidencia.tipo_ubicacion === TIPO_UBICACION.BLOQUE) {
    if (usuarioTieneAmbitoTotal(usuario, "BLOQUE")) return true;
    return listaAmbito(usuario.ambito_bloques).includes(incidencia.bloque);
  }
  if (incidencia.tipo_ubicacion === TIPO_UBICACION.ZONA_COMUN) {
    if (usuarioTieneAmbitoTotal(usuario, "ZONA")) return true;
    return listaAmbito(usuario.ambito_zonas).includes(incidencia.zona_comun);
  }
  return false;
}
