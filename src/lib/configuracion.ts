import { HOJAS } from "./constants";
import { leerFilasComoObjetos } from "./sheets";

// Lee un parámetro de negocio (fila clave=PARAMETRO) de la pestaña Configuracion.
export async function obtenerParametro(codigo: string, porDefecto: string): Promise<string> {
  const datos = await leerFilasComoObjetos(HOJAS.CONFIGURACION);
  const fila = datos.filas.find((f) => f.objeto.clave === "PARAMETRO" && f.objeto.codigo === codigo);
  return fila ? String(fila.objeto.valor_extra) : porDefecto;
}
