/**
 * Constantes de negocio — equivalente a Constantes.gs del backend Apps Script.
 * Mantener sincronizado el nombre de las pestañas con la hoja de cálculo real.
 */

export const HOJAS = {
  USUARIOS: "Usuarios",
  INCIDENCIAS: "Incidencias",
  ACTUACIONES: "Actuaciones",
  COMENTARIOS: "Comentarios",
  ARCHIVOS: "Archivos",
  CONFIGURACION: "Configuracion",
  AUDITORIA: "Auditoria",
  NOTIFICACIONES: "Notificaciones",
} as const;

export const ROLES = {
  ADMIN: "ADMIN",
  PRESIDENTE: "PRESIDENTE",
  VOCAL: "VOCAL",
  COORDINADOR: "COORDINADOR",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const ESTADOS = {
  REGISTRADA: "REGISTRADA",
  PENDIENTE_REVISION: "PENDIENTE_REVISION",
  ASIGNADA: "ASIGNADA",
  EN_CURSO: "EN_CURSO",
  PENDIENTE_PROVEEDOR: "PENDIENTE_PROVEEDOR",
  PENDIENTE_PRESUPUESTO: "PENDIENTE_PRESUPUESTO",
  RESUELTA: "RESUELTA",
  CERRADA: "CERRADA",
  REABIERTA: "REABIERTA",
  CANCELADA: "CANCELADA",
} as const;
export type Estado = (typeof ESTADOS)[keyof typeof ESTADOS];

export const TRANSICIONES_ESTADO: Record<Estado, Estado[]> = {
  REGISTRADA: ["PENDIENTE_REVISION", "ASIGNADA", "CANCELADA"],
  PENDIENTE_REVISION: ["ASIGNADA", "CANCELADA"],
  ASIGNADA: ["EN_CURSO", "PENDIENTE_PROVEEDOR", "PENDIENTE_PRESUPUESTO", "CANCELADA"],
  EN_CURSO: ["PENDIENTE_PROVEEDOR", "PENDIENTE_PRESUPUESTO", "RESUELTA", "CANCELADA"],
  PENDIENTE_PROVEEDOR: ["EN_CURSO", "CANCELADA"],
  PENDIENTE_PRESUPUESTO: ["EN_CURSO", "CANCELADA"],
  RESUELTA: ["CERRADA", "REABIERTA"],
  CERRADA: ["REABIERTA"],
  REABIERTA: ["ASIGNADA", "EN_CURSO", "CANCELADA"],
  CANCELADA: [],
};

export const ETIQUETAS_ESTADO: Record<Estado, string> = {
  REGISTRADA: "Registrada",
  PENDIENTE_REVISION: "Pendiente de revisión",
  ASIGNADA: "Asignada",
  EN_CURSO: "En curso",
  PENDIENTE_PROVEEDOR: "Pendiente de proveedor",
  PENDIENTE_PRESUPUESTO: "Pendiente de presupuesto",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
  REABIERTA: "Reabierta",
  CANCELADA: "Cancelada",
};

export const TIPO_UBICACION = { BLOQUE: "BLOQUE", ZONA_COMUN: "ZONA_COMUN" } as const;
export type TipoUbicacion = (typeof TIPO_UBICACION)[keyof typeof TIPO_UBICACION];

// Definición de los catálogos editables desde Administración (clave = marca
// guardada en la pestaña Configuracion, grupo = nombre usado por los
// formularios públicos, en plural, igual que el antiguo CATALOGOS estático).
export const DEFINICION_CATALOGOS = [
  { clave: "BLOQUE", grupo: "BLOQUES", etiqueta: "Bloques" },
  { clave: "PLANTA", grupo: "PLANTAS", etiqueta: "Plantas" },
  { clave: "ZONA", grupo: "ZONAS", etiqueta: "Zonas comunes" },
  { clave: "CATEGORIA", grupo: "CATEGORIAS", etiqueta: "Categorías" },
] as const;
export type ClaveCatalogo = (typeof DEFINICION_CATALOGOS)[number]["clave"];
export type GrupoCatalogo = (typeof DEFINICION_CATALOGOS)[number]["grupo"];

export const ESTADOS_SIN_TRABAJO_PENDIENTE: Estado[] = ["RESUELTA", "CERRADA", "CANCELADA"];
export const ESTADOS_PENDIENTES: Estado[] = ["PENDIENTE_REVISION", "PENDIENTE_PROVEEDOR", "PENDIENTE_PRESUPUESTO"];

// Códigos de filtro rápido del panel principal — equivalente a
// ETIQUETAS_FILTRO_RAPIDO de JsCliente.html.
export const ETIQUETAS_FILTRO_RAPIDO: Record<string, string> = {
  ABIERTAS: "Incidencias abiertas",
  URGENTES: "Urgentes",
  PENDIENTES: "Pendientes",
  VENCIDAS: "Vencidas",
  ASIGNADAS_A_MI: "Asignadas a mí",
  FINALIZADAS: "Finalizadas",
};

export const LIMITES = {
  TITULO_MAX: 120,
  DESCRIPCION_MAX: 4000,
  COMENTARIO_MAX: 2000,
  TEXTO_CORTO_MAX: 200,
  ARCHIVO_MAX_BYTES: 10 * 1024 * 1024,
  TIPOS_ARCHIVO_PERMITIDOS: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  EXTENSIONES_PERMITIDAS: ["jpg", "jpeg", "png", "webp", "pdf"],
};

export interface OpcionCatalogo {
  codigo: string;
  etiqueta: string;
}

// Catálogos de ubicación/categoría — réplica de los valores sembrados por
// ConfiguracionHojas.gs. Si en el futuro se gestionan desde Administración,
// sustituir por una lectura dinámica de la pestaña "Configuracion".
export const CATALOGOS = {
  BLOQUES: [1, 2, 3, 4].map((n) => ({ codigo: `B${n}`, etiqueta: `Bloque ${n}` })),
  PLANTAS: [
    { codigo: "PB", etiqueta: "Planta baja" },
    { codigo: "P1", etiqueta: "Planta 1" },
    { codigo: "P2", etiqueta: "Planta 2" },
    { codigo: "P3", etiqueta: "Planta 3" },
    { codigo: "P4", etiqueta: "Planta 4" },
    { codigo: "P5", etiqueta: "Planta 5" },
  ],
  ZONAS: [
    { codigo: "PLAZA", etiqueta: "Plaza" },
    { codigo: "PISCINA", etiqueta: "Piscina" },
    { codigo: "SALON", etiqueta: "Salón social" },
    { codigo: "GIM", etiqueta: "Gimnasio" },
    { codigo: "GARAJE", etiqueta: "Garaje" },
  ],
  CATEGORIAS: [
    { codigo: "ELEC", etiqueta: "Electricidad" },
    { codigo: "FONT", etiqueta: "Fontanería" },
    { codigo: "LIMP", etiqueta: "Limpieza" },
    { codigo: "ASC", etiqueta: "Ascensores" },
    { codigo: "SEG", etiqueta: "Seguridad" },
    { codigo: "JARD", etiqueta: "Jardinería" },
    { codigo: "PISC", etiqueta: "Piscina" },
    { codigo: "GIMN", etiqueta: "Gimnasio" },
    { codigo: "GARJ", etiqueta: "Garaje" },
    { codigo: "ESTR", etiqueta: "Daños estructurales" },
    { codigo: "MOB", etiqueta: "Mobiliario" },
    { codigo: "OTRO", etiqueta: "Otros" },
  ],
} satisfies Record<string, OpcionCatalogo[]>;
