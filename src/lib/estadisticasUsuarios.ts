import { HOJAS, ESTADOS_SIN_TRABAJO_PENDIENTE } from "./constants";
import { verificarPermiso } from "./permissions";
import { leerFilasComoObjetos } from "./sheets";
import { estaArchivada } from "./incidencias";
import type { Incidencia, Usuario } from "./types";

export interface ContadorUsuario {
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  creadas: number;
  asignadas: number;
  abiertas: number;
}

export async function obtenerEstadisticasUsuarios(actor: Usuario): Promise<{ usuarios: ContadorUsuario[]; sinIdentificar: number }> {
  verificarPermiso(actor, "USUARIOS_ESTADISTICAS_VER");
  const [cuentas, registros] = await Promise.all([leerFilasComoObjetos(HOJAS.USUARIOS), leerFilasComoObjetos(HOJAS.INCIDENCIAS)]);
  const usuarios = cuentas.filas.map(({ objeto }) => ({
    email: String(objeto.email || "").toLowerCase().trim(), nombre: String(objeto.nombre || objeto.email || ""), rol: String(objeto.rol || ""),
    activo: objeto.activo === true || objeto.activo === "TRUE" || objeto.activo === "VERDADERO", creadas: 0, asignadas: 0, abiertas: 0,
  }));
  function identificar(id: string, correo?: string): ContadorUsuario | undefined {
    const indices = cuentas.filas.flatMap(({ objeto }, indice) =>
      (correo ? String(objeto.email || "").toLowerCase().trim() === correo.toLowerCase().trim() : !!id && objeto.id_usuario === id) ? [indice] : []);
    return indices.length === 1 ? usuarios[indices[0]] : undefined;
  }
  const sinIdentificar = new Set<string>();
  for (const { objeto } of registros.filas) {
    const incidencia = objeto as Incidencia;
    const creador = identificar(incidencia.usuario_creador, incidencia.usuario_creador_email);
    if (creador) creador.creadas++;
    else sinIdentificar.add(incidencia.id_incidencia);
    if (incidencia.responsable || incidencia.responsable_email) {
      const responsable = identificar(incidencia.responsable, incidencia.responsable_email);
      if (responsable) {
        responsable.asignadas++;
        if (!estaArchivada(incidencia) && !ESTADOS_SIN_TRABAJO_PENDIENTE.includes(incidencia.estado)) responsable.abiertas++;
      } else sinIdentificar.add(incidencia.id_incidencia);
    }
  }
  return { usuarios: usuarios.sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, "es")), sinIdentificar: sinIdentificar.size };
}