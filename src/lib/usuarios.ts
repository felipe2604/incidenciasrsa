import { HOJAS } from "./constants";
import { leerFilasComoObjetos, type FilaCruda } from "./sheets";
import type { Usuario } from "./types";

function normalizarUsuario(o: FilaCruda, numeroFila: number): Usuario {
  return {
    id_usuario: o.id_usuario,
    email: String(o.email || "").toLowerCase().trim(),
    nombre: o.nombre,
    rol: o.rol,
    ambito_bloques: o.ambito_bloques || "",
    ambito_zonas: o.ambito_zonas || "",
    activo: o.activo === true || o.activo === "TRUE" || o.activo === "VERDADERO",
    _fila: numeroFila,
  };
}

// Lista blanca real de acceso: si el email no está aquí (o está inactivo), no
// entra, por más que el login de Google haya funcionado correctamente.
export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const normalizado = email.toLowerCase().trim();
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  for (const f of datos.filas) {
    if (String(f.objeto.email || "").toLowerCase().trim() === normalizado) {
      return normalizarUsuario(f.objeto, f.numeroFila);
    }
  }
  return null;
}
