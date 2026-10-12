/**
 * Catálogos de ubicación/categoría — gestionables desde Administración.
 * Se guardan en la pestaña Configuracion (columna clave=BLOQUE/PLANTA/ZONA/CATEGORIA).
 * Si una clave aún no tiene filas sembradas se usan los valores por defecto
 * de constants.ts, para no dejar los formularios vacíos en una hoja nueva;
 * el primer guardado desde Administración siembra la fila real.
 */
import { CATALOGOS, DEFINICION_CATALOGOS, HOJAS, type ClaveCatalogo, type GrupoCatalogo, type OpcionCatalogo } from "./constants";
import { actualizarCelda, agregarFila, leerFilasComoObjetos, obtenerEncabezados } from "./sheets";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import { sanearTextoEntrada } from "./validaciones";
import { registrarAuditoria } from "./auditoria";
import type { Usuario } from "./types";

export type { ClaveCatalogo, GrupoCatalogo };

const VALORES_POR_DEFECTO: Record<ClaveCatalogo, OpcionCatalogo[]> = {
  BLOQUE: CATALOGOS.BLOQUES,
  PLANTA: CATALOGOS.PLANTAS,
  ZONA: CATALOGOS.ZONAS,
  CATEGORIA: CATALOGOS.CATEGORIAS,
};

export interface OpcionCatalogoFila extends OpcionCatalogo {
  activo: boolean;
  orden: number;
}

function filaAOpcion(objeto: Record<string, unknown>): OpcionCatalogoFila {
  return {
    codigo: String(objeto.codigo || ""),
    etiqueta: String(objeto.etiqueta || objeto.codigo || ""),
    activo: objeto.activo !== false && objeto.activo !== "FALSE",
    orden: Number(objeto.orden || 0),
  };
}

// Vista completa (incluye inactivos) para la pantalla de Administración.
export async function obtenerCatalogosCompletos(): Promise<Record<GrupoCatalogo, OpcionCatalogoFila[]>> {
  const datos = await leerFilasComoObjetos(HOJAS.CONFIGURACION);
  const resultado = {} as Record<GrupoCatalogo, OpcionCatalogoFila[]>;
  for (const { clave, grupo } of DEFINICION_CATALOGOS) {
    const filas = datos.filas.filter((f) => f.objeto.clave === clave).map((f) => filaAOpcion(f.objeto));
    filas.sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta));
    resultado[grupo] = filas.length > 0 ? filas : VALORES_POR_DEFECTO[clave].map((o, i) => ({ ...o, activo: true, orden: i }));
  }
  return resultado;
}

// Vista pública (solo activos) para formularios y filtros de toda la app.
export async function obtenerCatalogos(): Promise<Record<GrupoCatalogo, OpcionCatalogo[]>> {
  const completos = await obtenerCatalogosCompletos();
  const resultado = {} as Record<GrupoCatalogo, OpcionCatalogo[]>;
  for (const { grupo } of DEFINICION_CATALOGOS) {
    resultado[grupo] = completos[grupo].filter((o) => o.activo).map(({ codigo, etiqueta }) => ({ codigo, etiqueta }));
  }
  return resultado;
}

export interface DatosOpcionCatalogo {
  codigo: string;
  etiqueta: string;
  orden?: number;
  activo?: boolean;
}

// Crea o actualiza (si el código ya existe en esa clave) una opción de catálogo.
export async function guardarOpcionCatalogo(actor: Usuario, clave: ClaveCatalogo, datos: DatosOpcionCatalogo): Promise<void> {
  verificarPermiso(actor, "CATALOGOS_GESTIONAR");
  const codigo = sanearTextoEntrada(datos.codigo, 50).toUpperCase();
  const etiqueta = sanearTextoEntrada(datos.etiqueta, 150);
  if (!codigo) throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", { codigo: "El código es obligatorio." });
  if (!etiqueta) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", { etiqueta: "La etiqueta es obligatoria." });
  }

  const datosHoja = await leerFilasComoObjetos(HOJAS.CONFIGURACION);
  const encabezados = datosHoja.encabezados.length > 0 ? datosHoja.encabezados : await obtenerEncabezados(HOJAS.CONFIGURACION);
  const existente = datosHoja.filas.find((f) => f.objeto.clave === clave && String(f.objeto.codigo) === codigo);

  if (existente) {
    await actualizarCelda(HOJAS.CONFIGURACION, existente.numeroFila, encabezados, {
      etiqueta,
      orden: datos.orden ?? existente.objeto.orden ?? 0,
      activo: datos.activo !== false,
    });
    await registrarAuditoria("EDITAR_CATALOGO", "CATALOGO", `${clave}:${codigo}`, "Opción de catálogo actualizada", "OK");
    return;
  }

  await agregarFila(HOJAS.CONFIGURACION, encabezados, {
    clave,
    codigo,
    etiqueta,
    orden: datos.orden ?? 0,
    activo: datos.activo !== false,
    valor_extra: "",
  });
  await registrarAuditoria("CREAR_CATALOGO", "CATALOGO", `${clave}:${codigo}`, "Opción de catálogo creada", "OK");
}

// Baja lógica: nunca se borra la fila, para no romper incidencias históricas
// que ya referencian ese código.
export async function eliminarOpcionCatalogo(actor: Usuario, clave: ClaveCatalogo, codigo: string): Promise<void> {
  verificarPermiso(actor, "CATALOGOS_GESTIONAR");
  const datosHoja = await leerFilasComoObjetos(HOJAS.CONFIGURACION);
  const existente = datosHoja.filas.find((f) => f.objeto.clave === clave && String(f.objeto.codigo) === codigo);
  if (!existente) throw new ErrorAplicacion("NO_ENCONTRADO", "Opción de catálogo no encontrada.");
  await actualizarCelda(HOJAS.CONFIGURACION, existente.numeroFila, datosHoja.encabezados, { activo: false });
  await registrarAuditoria("DESACTIVAR_CATALOGO", "CATALOGO", `${clave}:${codigo}`, "Opción de catálogo desactivada", "OK");
}
