import { z } from "zod";
import { PRIORIDADES, ROLES, TIPO_UBICACION } from "./constants";

// Normaliza campos opcionales que pueden llegar como null (p. ej. de un
// FormData.get() sobre un <select> que no está en el DOM) a undefined, para
// que el tipo de salida encaje con el resto de la capa de negocio (string|undefined).
const textoOpcional = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
    .nullish()
    .transform((v) => v ?? undefined);

// Validación de forma/tipo en el borde de la API (defensa en profundidad):
// los límites de negocio exactos (longitudes, saneado) siguen viviendo en
// validaciones.ts, que es la fuente única de verdad para esas reglas.
export const esquemaNuevaIncidencia = z.object({
  titulo: z.string().min(1).max(500),
  descripcion: z.string().min(1).max(10000),
  tipoUbicacion: z.enum([TIPO_UBICACION.BLOQUE, TIPO_UBICACION.ZONA_COMUN]),
  bloque: textoOpcional(50),
  planta: textoOpcional(50),
  zonaComun: textoOpcional(50),
  ubicacionDetalle: textoOpcional(500),
  categoria: z.string().min(1).max(50),
  prioridad: z.enum(PRIORIDADES),
  costeEstimado: z.union([z.string(), z.number()]).nullish().transform((v) => v ?? undefined),
  proveedor: textoOpcional(300),
  fechaPrevistaActuacion: textoOpcional(50),
  responsableEmail: z.union([z.string().email().max(200), z.literal("")]).optional(),
  confidencial: z.boolean().optional(),
});

export const esquemaCambiarEstado = z.object({
  estado: z.string().min(1).max(50),
});

export const esquemaComentario = z.object({
  texto: z.string().min(1).max(5000),
});

export const esquemaArchivoNuevo = z.object({
  idIncidencia: z.string().min(1).max(50),
  nombreOriginal: z.string().min(1).max(300),
  tipoMime: z.string().min(1).max(100),
  contenidoBase64: z.string().min(1),
});

export const esquemaUsuario = z.object({
  email: z.string().email().max(200),
  nombre: z.string().min(1).max(150),
  rol: z.enum([ROLES.ADMIN, ROLES.PRESIDENTE, ROLES.VOCAL, ROLES.COORDINADOR, ROLES.ADMINISTRADOR_FINCAS]),
  ambitoBloques: z.string().max(500).nullish().transform((v) => v ?? undefined),
  ambitoZonas: z.string().max(500).nullish().transform((v) => v ?? undefined),
  activo: z.boolean().optional(),
  password: z.string().max(128).optional(),
  accesoPassword: z.boolean().optional(),
});

const CLAVES_CATALOGO = ["BLOQUE", "PLANTA", "ZONA", "CATEGORIA"] as const;

export const esquemaOpcionCatalogo = z.object({
  clave: z.enum(CLAVES_CATALOGO),
  codigo: z.string().min(1).max(50),
  etiqueta: z.string().min(1).max(150),
  orden: z.number().optional(),
  activo: z.boolean().optional(),
});

export const esquemaEliminarCatalogo = z.object({
  clave: z.enum(CLAVES_CATALOGO),
  codigo: z.string().min(1).max(50),
});
