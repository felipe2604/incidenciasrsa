import { HOJAS, ROLES, type Rol } from "./constants";
import { actualizarCelda, agregarFila, generarSiguienteId, leerFilasComoObjetos, obtenerEncabezados, type FilaCruda } from "./sheets";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import { sanearTextoEntrada } from "./validaciones";
import { registrarAuditoria } from "./auditoria";
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

// Equivalente a listarUsuariosCliente de Usuarios.gs: solo quien gestiona
// usuarios (ADMIN) puede ver la lista completa de altas.
export async function listarUsuarios(actor: Usuario): Promise<Usuario[]> {
  verificarPermiso(actor, "USUARIOS_GESTIONAR");
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  return datos.filas
    .map((f) => normalizarUsuario(f.objeto, f.numeroFila))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
}

export interface DatosUsuarioEntrada {
  email: string;
  nombre: string;
  rol: string;
  ambitoBloques?: string;
  ambitoZonas?: string;
  activo?: boolean;
}

// Equivalente a guardarUsuarioCliente: crea o actualiza según exista ya el
// email (misma regla que el backend Apps Script original).
export async function guardarUsuario(actor: Usuario, datos: DatosUsuarioEntrada): Promise<string> {
  verificarPermiso(actor, "USUARIOS_GESTIONAR");
  const email = sanearTextoEntrada(datos.email, 200).toLowerCase();
  const nombre = sanearTextoEntrada(datos.nombre, 150);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", { email: "Correo electrónico no válido." });
  }
  if (!nombre) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", { nombre: "El nombre es obligatorio." });
  }
  if (!Object.values(ROLES).includes(datos.rol as Rol)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", { rol: "Rol no válido." });
  }

  const encabezados = await obtenerEncabezados(HOJAS.USUARIOS);
  const ahora = new Date().toISOString();
  const existente = await buscarUsuarioPorEmail(email);

  if (existente) {
    await actualizarCelda(HOJAS.USUARIOS, existente._fila, encabezados, {
      nombre,
      rol: datos.rol,
      ambito_bloques: sanearTextoEntrada(datos.ambitoBloques, 500),
      ambito_zonas: sanearTextoEntrada(datos.ambitoZonas, 500),
      activo: datos.activo !== false,
      fecha_ultima_modificacion: ahora,
      usuario_ultima_modificacion: actor.id_usuario,
    });
    await registrarAuditoria("EDITAR_USUARIO", "USUARIO", existente.id_usuario, "Usuario actualizado", "OK");
    return existente.id_usuario;
  }

  const idNuevo = await generarSiguienteId("U");
  await agregarFila(HOJAS.USUARIOS, encabezados, {
    id_usuario: idNuevo,
    email,
    nombre,
    rol: datos.rol,
    ambito_bloques: sanearTextoEntrada(datos.ambitoBloques, 500),
    ambito_zonas: sanearTextoEntrada(datos.ambitoZonas, 500),
    activo: datos.activo !== false,
    fecha_alta: ahora,
    fecha_ultima_modificacion: ahora,
    usuario_ultima_modificacion: actor.id_usuario,
  });
  await registrarAuditoria("CREAR_USUARIO", "USUARIO", idNuevo, `Usuario creado: ${email}`, "OK");
  return idNuevo;
}
