import { createHash } from "node:crypto";
import { HOJAS } from "./constants";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import { eliminarFilaHoja, leerFilasComoObjetos, type FilaCruda } from "./sheets";
import { registrarAuditoria } from "./auditoria";
import type { Usuario } from "./types";

export interface CorreoEntrante { id: string; fecha: string; remitente: string; asunto: string; cuerpo: string }

// El número de fila cambia al borrar otras filas, así que se identifica por contenido.
function huella(fila: FilaCruda): string {
  const campos = [fila.fecha, fila.remitente, fila.asunto, fila.cuerpo].map((valor) => String(valor ?? ""));
  return createHash("sha256").update(JSON.stringify(campos)).digest("hex").slice(0, 32);
}

export async function listarCorreos(actor: Usuario): Promise<CorreoEntrante[]> {
  verificarPermiso(actor, "MAILS_GESTIONAR");
  const datos = await leerFilasComoObjetos(HOJAS.MAILS);
  return datos.filas.map(({ objeto }) => ({
    id: huella(objeto), fecha: String(objeto.fecha ?? ""), remitente: String(objeto.remitente ?? ""),
    asunto: String(objeto.asunto ?? ""), cuerpo: String(objeto.cuerpo ?? ""),
  })).reverse();
}

export async function existeCorreo(actor: Usuario, id: string): Promise<boolean> {
  return (await listarCorreos(actor)).some((correo) => correo.id === id);
}

export async function eliminarCorreo(actor: Usuario, id: string): Promise<void> {
  verificarPermiso(actor, "MAILS_GESTIONAR");
  const datos = await leerFilasComoObjetos(HOJAS.MAILS);
  const fila = datos.filas.find(({ objeto }) => huella(objeto) === id);
  if (!fila) throw new ErrorAplicacion("NO_ENCONTRADO", "El correo ya no existe.");
  await eliminarFilaHoja(HOJAS.MAILS, fila.numeroFila);
  await registrarAuditoria("ELIMINAR_CORREO", "CORREO", id, `Correo: ${String(fila.objeto.asunto ?? "").slice(0, 100)}`, "OK");
}
