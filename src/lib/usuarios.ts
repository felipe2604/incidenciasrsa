import { HOJAS, ROLES, type Rol } from "./constants";
import { randomBytes, randomUUID } from "node:crypto";
import { actualizarCelda, agregarFila, generarSiguienteId, leerFilasComoObjetos, obtenerEncabezados, type FilaCruda } from "./sheets";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import { sanearTextoEntrada } from "./validaciones";
import { registrarAuditoria } from "./auditoria";
import { comprobarPassword, crearHashPassword } from "./password";
import type { Usuario } from "./types";

function normalizarUsuario(o: FilaCruda, numeroFila: number, idUnico: boolean): Usuario {
  const accesoPassword = o.acceso_password === undefined || o.acceso_password === "" ? !!o.password_hash :
    o.acceso_password === true || o.acceso_password === "TRUE";
  return {
    id_usuario: o.id_usuario,
    email: String(o.email || "").toLowerCase().trim(),
    nombre: o.nombre,
    rol: o.rol,
    ambito_bloques: o.ambito_bloques || "",
    ambito_zonas: o.ambito_zonas || "",
    activo: o.activo === true || o.activo === "TRUE" || o.activo === "VERDADERO",
    acceso_password: accesoPassword,
    cambio_password_obligatorio: accesoPassword && (o.cambio_password_obligatorio === undefined || o.cambio_password_obligatorio === "" ?
      !!o.password_hash : o.cambio_password_obligatorio === true || o.cambio_password_obligatorio === "TRUE"),
    version_sesion: String(o.version_sesion || ""),
    password_expira: String(o.password_expira || ""),
    id_unico: idUnico,
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
      return normalizarUsuario(f.objeto, f.numeroFila, !!f.objeto.id_usuario && datos.filas.filter((fila) => fila.objeto.id_usuario === f.objeto.id_usuario).length === 1);
    }
  }
  return null;
}

const accesosEnCurso = new Set<string>();

export async function autenticarConPassword(email: string, password: string): Promise<Usuario | null> {
  const normalizado = email.toLowerCase().trim();
  if (accesosEnCurso.has(normalizado)) return null;
  accesosEnCurso.add(normalizado);
  try {
    return await comprobarCredenciales(normalizado, password);
  } finally {
    accesosEnCurso.delete(normalizado);
  }
}

async function comprobarCredenciales(email: string, password: string): Promise<Usuario | null> {
  if (!email || email.length > 200 || !password || password.length > 128) return null;
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  const fila = datos.filas.find((f) => String(f.objeto.email || "").toLowerCase().trim() === email.toLowerCase().trim());
  const usuario = fila ? normalizarUsuario(fila.objeto, fila.numeroFila, !!fila.objeto.id_usuario && datos.filas.filter((f) => f.objeto.id_usuario === fila.objeto.id_usuario).length === 1) : null;
  if (!fila || !usuario?.activo || !usuario.acceso_password ||
      (usuario.password_expira && Date.parse(usuario.password_expira) <= Date.now())) {
    await comprobarPassword(password, undefined);
    return null;
  }
  const bloqueadoHasta = Date.parse(String(fila.objeto.auth_bloqueado_hasta || ""));
  if (bloqueadoHasta > Date.now()) return null;
  const encabezados = await obtenerEncabezados(HOJAS.USUARIOS, ["auth_intentos", "auth_bloqueado_hasta"]);
  const intentos = Number.isFinite(bloqueadoHasta) ? 0 : Math.max(0, Number(fila.objeto.auth_intentos) || 0);
  if (!(await comprobarPassword(password, fila.objeto.password_hash))) {
    const nuevosIntentos = intentos + 1;
    await actualizarCelda(HOJAS.USUARIOS, fila.numeroFila, encabezados, {
      auth_intentos: nuevosIntentos,
      auth_bloqueado_hasta: nuevosIntentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : "",
    });
    return null;
  }
  await actualizarCelda(HOJAS.USUARIOS, fila.numeroFila, encabezados, { auth_intentos: 0, auth_bloqueado_hasta: "" });
  return usuario;
}

// Equivalente a listarUsuariosCliente de Usuarios.gs: solo quien gestiona
// usuarios (ADMIN) puede ver la lista completa de altas.
export async function listarUsuarios(actor: Usuario): Promise<Usuario[]> {
  verificarPermiso(actor, "USUARIOS_GESTIONAR");
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  return datos.filas
    .map((f) => normalizarUsuario(f.objeto, f.numeroFila, !!f.objeto.id_usuario && datos.filas.filter((fila) => fila.objeto.id_usuario === f.objeto.id_usuario).length === 1))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
}

export interface DatosUsuarioEntrada {
  email: string;
  nombre: string;
  rol: string;
  ambitoBloques?: string;
  ambitoZonas?: string;
  activo?: boolean;
  password?: string;
  accesoPassword?: boolean;
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

  const ahora = new Date().toISOString();
  const existente = await buscarUsuarioPorEmail(email);
  let credenciales: FilaCruda = {};
  if (datos.password) {
    if (datos.password.length < 12 || datos.password.length > 128) {
      throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise la contraseña.", {
        password: "La contraseña debe tener entre 12 y 128 caracteres.",
      });
    }
    credenciales = {
      password_hash: await crearHashPassword(datos.password), auth_intentos: 0, auth_bloqueado_hasta: "",
      cambio_password_obligatorio: true, password_expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      version_sesion: randomUUID(),
    };
  }
  const accesoPassword = datos.accesoPassword ?? existente?.acceso_password ?? !!datos.password;
  if (datos.password && !accesoPassword) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Habilite el acceso con contraseña antes de establecerla.");
  }
  if (accesoPassword && !datos.password) {
    const filas = await leerFilasComoObjetos(HOJAS.USUARIOS);
    const hashExistente = filas.filas.find((f) => String(f.objeto.email || "").toLowerCase().trim() === email)?.objeto.password_hash;
    if (!hashExistente) {
      throw new ErrorAplicacion("DATOS_INVALIDOS", "Establezca una contraseña para este usuario.", {
        password: "Introduzca una contraseña de al menos 12 caracteres.",
      });
    }
  }
  if (existente && (datos.activo === false || accesoPassword !== existente.acceso_password)) {
    credenciales.version_sesion = randomUUID();
  }
  credenciales.acceso_password = accesoPassword;
  const encabezados = await obtenerEncabezados(HOJAS.USUARIOS, Object.keys(credenciales));

  if (existente) {
    await actualizarCelda(HOJAS.USUARIOS, existente._fila, encabezados, {
      ...credenciales,
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
    ...credenciales,
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

export async function cambiarPasswordPropia(actor: Usuario, actual: string, nueva: string): Promise<void> {
  if (nueva.length < 12 || nueva.length > 128) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "La contraseña debe tener entre 12 y 128 caracteres.");
  }
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  const fila = datos.filas.find((f) => f.objeto.id_usuario === actor.id_usuario &&
    String(f.objeto.email || "").toLowerCase().trim() === actor.email.toLowerCase().trim());
  if (!fila || !actor.acceso_password || !(await comprobarPassword(actual, fila.objeto.password_hash))) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "La contraseña actual no es correcta.");
  }
  if (await comprobarPassword(nueva, fila.objeto.password_hash)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "La nueva contraseña debe ser distinta de la actual.");
  }
  const cambios = {
    password_hash: await crearHashPassword(nueva), cambio_password_obligatorio: false,
    password_expira: "", version_sesion: randomUUID(), auth_intentos: 0, auth_bloqueado_hasta: "",
  };
  const encabezados = await obtenerEncabezados(HOJAS.USUARIOS, Object.keys(cambios));
  await actualizarCelda(HOJAS.USUARIOS, fila.numeroFila, encabezados, cambios);
  await registrarAuditoria("CAMBIAR_PASSWORD", "USUARIO", actor.id_usuario, "Contraseña actualizada", "OK");
}

export async function resetearPassword(actor: Usuario, idUsuario: string, email?: string): Promise<string> {
  verificarPermiso(actor, "USUARIOS_GESTIONAR");
  const correo = email?.toLowerCase().trim();
  if (actor.id_usuario === idUsuario && (!correo || correo === actor.email.toLowerCase().trim())) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Utilice Mi perfil para cambiar su propia contraseña.");
  }
  const datos = await leerFilasComoObjetos(HOJAS.USUARIOS);
  const coincidencias = datos.filas.filter((f) => f.objeto.id_usuario === idUsuario &&
    (!correo || String(f.objeto.email || "").toLowerCase().trim() === correo));
  if (coincidencias.length === 0) throw new ErrorAplicacion("NO_ENCONTRADO", "Usuario no encontrado.");
  if (coincidencias.length !== 1) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "El identificador está duplicado. Recargue Usuarios y seleccione de nuevo la cuenta.");
  }
  const fila = coincidencias[0];
  const temporal = randomBytes(18).toString("base64url");
  const cambios = {
    password_hash: await crearHashPassword(temporal), acceso_password: true, cambio_password_obligatorio: true,
    password_expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    version_sesion: randomUUID(), auth_intentos: 0, auth_bloqueado_hasta: "",
  };
  const encabezados = await obtenerEncabezados(HOJAS.USUARIOS, Object.keys(cambios));
  await actualizarCelda(HOJAS.USUARIOS, fila.numeroFila, encabezados, cambios);
  await registrarAuditoria("RESETEAR_PASSWORD", "USUARIO", idUsuario, "Contraseña temporal generada", "OK");
  return temporal;
}
