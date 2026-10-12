import type { Estado, Prioridad, Rol, TipoUbicacion } from "./constants";

export interface Usuario {
  id_usuario: string;
  email: string;
  nombre: string;
  rol: Rol;
  ambito_bloques: string;
  ambito_zonas: string;
  activo: boolean;
  _fila: number;
}

export interface Incidencia {
  id_incidencia: string;
  fecha_creacion: string;
  usuario_creador: string;
  titulo: string;
  descripcion: string;
  tipo_ubicacion: TipoUbicacion;
  bloque: string;
  planta: string;
  zona_comun: string;
  ubicacion_detalle: string;
  categoria: string;
  prioridad: Prioridad;
  estado: Estado;
  responsable: string;
  fecha_prevista_actuacion: string;
  fecha_resolucion: string;
  descripcion_solucion: string;
  coste_estimado: string | number;
  coste_real: string | number;
  proveedor: string;
  confidencial: boolean | string;
  fecha_ultima_modificacion: string;
  usuario_ultima_modificacion: string;
  archivada: boolean | string;
}

export interface Archivo {
  id_archivo: string;
  id_incidencia: string;
  id_actuacion: string;
  nombre_original: string;
  nombre_almacenado: string;
  url_blob: string;
  tipo_mime: string;
  tamano_bytes: number;
  fecha_subida: string;
  usuario_subida: string;
  eliminado: boolean | string;
}

export interface Comentario {
  id_comentario: string;
  id_incidencia: string;
  fecha: string;
  usuario: string;
  texto: string;
  interno: boolean | string;
}

export interface IncidenciaProyectada {
  idIncidencia: string;
  fechaCreacion: string;
  usuarioCreador: string;
  titulo: string;
  descripcion: string;
  tipoUbicacion: TipoUbicacion;
  bloque: string;
  planta: string;
  zonaComun: string;
  ubicacionDetalle: string;
  categoria: string;
  prioridad: Prioridad;
  estado: Estado;
  responsable: string;
  fechaPrevistaActuacion: string;
  fechaResolucion: string;
  costeEstimado: string | number;
  costeReal: string | number;
  proveedor: string;
  confidencial: boolean;
  archivada: boolean;
  fechaUltimaModificacion: string;
}
