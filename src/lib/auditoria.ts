import { HOJAS } from "./constants";
import { agregarFila, obtenerEncabezados } from "./sheets";

// Registro de auditoría — puerto de Auditoria.gs. No lanza si falla: un fallo
// al auditar nunca debe impedir la operación de negocio que se está auditando.
export async function registrarAuditoria(
  accion: string,
  entidad: string,
  idEntidad: string,
  detalle: string,
  resultado: "OK" | "ERROR"
): Promise<void> {
  try {
    const encabezados = await obtenerEncabezados(HOJAS.AUDITORIA);
    await agregarFila(HOJAS.AUDITORIA, encabezados, {
      id_auditoria: `AUD-${Date.now()}`,
      fecha: new Date().toISOString(),
      accion,
      entidad,
      id_entidad: idEntidad,
      detalle,
      resultado,
    });
  } catch {
    // Silenciado intencionadamente: ver comentario superior.
  }
}
