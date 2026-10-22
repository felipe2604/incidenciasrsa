const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function cargar(archivo, imports = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(codigo, { exports, Buffer, Date, URLSearchParams, process: { env: { GOOGLE_SHEETS_SPREADSHEET_ID: "TEST" } }, require: (nombre) => imports[nombre] || require(nombre) });
  return exports;
}

const constantes = cargar("src/lib/constants.ts");
const permisos = cargar("src/lib/permissions.ts", { "./constants": constantes });
const claves = cargar("src/lib/password.ts");
const admin = { id_usuario: "ADMIN-TEST", email: "admin@example.invalid", rol: "ADMIN", activo: true };
const vocal = { id_usuario: "VOCAL-TEST", email: "vocal@example.invalid", rol: "VOCAL", activo: true, ambito_bloques: "B1", ambito_zonas: "PISCINA" };
const passwordPrueba = "Solo-pruebas-locales-123";

function entornoUsuarios(fila, anteriores = []) {
  const escrituras = [];
  const filas = [...anteriores, fila];
  const usuarios = cargar("src/lib/usuarios.ts", {
    "./constants": constantes, "./permissions": permisos, "./password": claves,
    "./sheets": {
      leerFilasComoObjetos: async () => ({ filas: filas.map((objeto, indice) => ({ objeto, numeroFila: indice + 2 })) }),
      obtenerEncabezados: async () => [],
      actualizarCelda: async (_hoja, indice, _encabezados, cambios) => { Object.assign(filas[indice - 2], cambios); escrituras.push(cambios); },
    },
    "./validaciones": { sanearTextoEntrada: (valor) => String(valor || "").trim() },
    "./auditoria": { registrarAuditoria: async () => {} },
  });
  return { usuarios, escrituras };
}

test("todos los roles habilitados entran con contraseña y deben cambiar la inicial", async () => {
  const hash = await claves.crearHashPassword(passwordPrueba);
  for (const rol of Object.values(constantes.ROLES)) {
    const { usuarios } = entornoUsuarios({ ...vocal, rol, password_hash: hash, acceso_password: true });
    const usuario = await usuarios.autenticarConPassword(vocal.email, passwordPrueba);
    assert.equal(usuario.rol, rol);
    assert.equal(usuario.cambio_password_obligatorio, true);
    assert.equal("password_hash" in usuario, false);
  }
});

test("se rechazan cuentas inactivas, acceso deshabilitado y contraseñas caducadas", async () => {
  const hash = await claves.crearHashPassword(passwordPrueba);
  for (const cambios of [{ activo: false }, { acceso_password: false }, { password_expira: "2020-01-01T00:00:00Z" }]) {
    const { usuarios } = entornoUsuarios({ ...vocal, password_hash: hash, acceso_password: true, ...cambios });
    assert.equal(await usuarios.autenticarConPassword(vocal.email, passwordPrueba), null);
  }
});

test("cinco fallos bloquean el acceso y el bloqueo caduca", async () => {
  const fila = { ...vocal, acceso_password: true, password_hash: await claves.crearHashPassword(passwordPrueba) };
  const { usuarios } = entornoUsuarios(fila);
  for (let intento = 0; intento < 5; intento++) assert.equal(await usuarios.autenticarConPassword(vocal.email, "incorrecta"), null);
  assert.ok(Date.parse(fila.auth_bloqueado_hasta) > Date.now());
  assert.equal(await usuarios.autenticarConPassword(vocal.email, passwordPrueba), null);
  fila.auth_bloqueado_hasta = new Date(Date.now() - 1000).toISOString();
  assert.ok(await usuarios.autenticarConPassword(vocal.email, passwordPrueba));
  assert.equal(fila.auth_intentos, 0);
});

test("ADMIN resetea sin exponer hashes y el cambio de contraseña revoca sesiones", async () => {
  const fila = { ...vocal };
  const { usuarios, escrituras } = entornoUsuarios(fila);
  await assert.rejects(() => usuarios.resetearPassword(vocal, vocal.id_usuario), (error) => error.codigo === "PERMISO_DENEGADO");
  assert.equal(escrituras.length, 0);
  await assert.rejects(() => usuarios.resetearPassword(admin, admin.id_usuario));
  const temporal = await usuarios.resetearPassword(admin, vocal.id_usuario);
  assert.ok(await claves.comprobarPassword(temporal, fila.password_hash));
  assert.equal(fila.cambio_password_obligatorio, true);
  assert.ok(Date.parse(fila.password_expira) > Date.now());
  const anterior = fila.version_sesion;
  const actor = await usuarios.buscarUsuarioPorEmail(vocal.email);
  await assert.rejects(() => usuarios.cambiarPasswordPropia(actor, "incorrecta", passwordPrueba));
  await assert.rejects(() => usuarios.cambiarPasswordPropia(actor, temporal, temporal));
  await usuarios.cambiarPasswordPropia(actor, temporal, passwordPrueba);
  assert.equal(fila.cambio_password_obligatorio, false);
  assert.equal(fila.password_expira, "");
  assert.notEqual(fila.version_sesion, anterior);
  assert.ok(await claves.comprobarPassword(passwordPrueba, fila.password_hash));
});

test("las operaciones rechazan sesión caducada, revocada y cambio pendiente", async () => {
  let usuario = { ...vocal, version_sesion: "actual", cambio_password_obligatorio: true };
  let session = { user: { email: vocal.email, versionSesion: "actual", expiraAcceso: Date.now() + 60000 } };
  const sesion = cargar("src/lib/sesion.ts", {
    "next-auth": { getServerSession: async () => session }, "@/auth": { authOptions: {} },
    "./usuarios": { buscarUsuarioPorEmail: async () => usuario }, "./configuracion": { obtenerParametro: async () => "FALSE" },
    "./permissions": permisos, "./constants": constantes,
  });
  await assert.rejects(() => sesion.obtenerUsuarioActual(), (error) => error.codigo === "CAMBIO_PASSWORD_OBLIGATORIO");
  assert.ok(await sesion.obtenerUsuarioActual({ permitirCambioPassword: true }));
  usuario = { ...usuario, cambio_password_obligatorio: false, version_sesion: "nueva" };
  await assert.rejects(() => sesion.obtenerUsuarioActual(), (error) => error.codigo === "ACCESO_NO_AUTORIZADO");
  session = { user: { email: vocal.email, versionSesion: "nueva", expiraAcceso: Date.now() - 1 } };
  await assert.rejects(() => sesion.obtenerUsuarioActual(), (error) => error.codigo === "ACCESO_NO_AUTORIZADO");
});

function entornoIncidencias(filas, usuarios = [admin, vocal]) {
  const sheets = {
    leerFilasComoObjetos: async (hoja) => ({ encabezados: [], filas: (hoja === "Usuarios" ? usuarios : filas).map((objeto, indice) => ({ objeto, numeroFila: indice + 2 })) }),
    obtenerEncabezados: async () => [],
    actualizarCelda: async (_hoja, indice, _encabezados, cambios) => Object.assign(filas[indice - 2], cambios),
    generarSiguienteId: async () => `TEST-NUEVA-${filas.length + 1}`,
    agregarFila: async (_hoja, _encabezados, objeto) => filas.push(objeto),
  };
  const validaciones = cargar("src/lib/validaciones.ts", { "./constants": constantes, "./permissions": permisos });
  const asignaciones = cargar("src/lib/asignaciones.ts", { "./constants": constantes, "./permissions": permisos, "./sheets": sheets });
  return cargar("src/lib/incidencias.ts", {
    "./constants": constantes, "./permissions": permisos, "./validaciones": validaciones, "./asignaciones": asignaciones,
    "./auditoria": { registrarAuditoria: async () => {} },
    "./sheets": sheets,
  });
}

test("crear asigna al creador por defecto y permite elegir cualquier cuenta activa", async () => {
  const filas = [];
  const lib = entornoIncidencias(filas);
  const datos = { titulo: "Nueva incidencia", descripcion: "Descripción", tipoUbicacion: "BLOQUE", bloque: "B1", planta: "P1", categoria: "FONT", prioridad: "MEDIA" };
  await lib.crearIncidencia(vocal, datos);
  assert.equal(filas[0].responsable_email, vocal.email);
  assert.equal(filas[0].usuario_creador_email, vocal.email);
  await lib.crearIncidencia(vocal, { ...datos, responsableEmail: admin.email, fechaPrevistaActuacion: "2026-12-01" });
  assert.equal(filas[1].responsable_email, admin.email);
  assert.equal(filas[1].responsable, admin.id_usuario);
  await assert.rejects(() => lib.crearIncidencia(vocal, { ...datos, responsableEmail: "inexistente@example.invalid" }));
  await assert.rejects(() => lib.crearIncidencia(vocal, { ...datos, fechaPrevistaActuacion: "2026-02-30" }));
});

test("asignar permite leer fuera de ámbito sin dar edición ni revelar descripciones confidenciales", async () => {
  const fila = { id_incidencia: "ASIGNADA", usuario_creador: admin.id_usuario, usuario_creador_email: admin.email, responsable: vocal.id_usuario,
    responsable_email: vocal.email, tipo_ubicacion: "BLOQUE", bloque: "B2", estado: "REGISTRADA", titulo: "Asignada", confidencial: true, descripcion: "Privada" };
  const lib = entornoIncidencias([fila]);
  assert.equal((await lib.listarIncidencias(vocal)).length, 1);
  assert.equal((await lib.obtenerIncidenciaDetalle(vocal, "ASIGNADA")).descripcion, "(Información confidencial)");
  await assert.rejects(() => lib.actualizarIncidencia(vocal, "ASIGNADA", {}), (error) => error.codigo === "PERMISO_DENEGADO");
  await assert.rejects(() => lib.cambiarEstadoIncidencia(vocal, "ASIGNADA", "ASIGNADA"), (error) => error.codigo === "PERMISO_DENEGADO");
  const otra = { ...vocal, email: "otra@example.invalid", id_unico: false };
  assert.equal((await lib.listarIncidencias(otra)).length, 0);
});

function entornoNotificaciones(incidencias, registros = []) {
  const sheets = {
    leerFilasComoObjetos: async (hoja) => ({ filas: (hoja === "Incidencias" ? incidencias : registros).map((objeto) => ({ objeto })) }),
    obtenerEncabezados: async () => [],
    agregarFila: async (_hoja, _headers, objeto) => registros.push(objeto),
  };
  return cargar("src/lib/notificaciones.ts", { "./constants": constantes, "./permissions": permisos, "./incidencias": entornoIncidencias([]), "./sheets": sheets });
}

test("avisos propios de asignación, próximos dos días y vencidos excluyen cerradas y otras personas", () => {
  const filas = [
    { id_incidencia: "PROXIMA", responsable: vocal.id_usuario, responsable_email: vocal.email, titulo: "Próxima", estado: "EN_CURSO", fecha_creacion: "2026-10-01", fecha_prevista_actuacion: "2026-10-24" },
    { id_incidencia: "VENCIDA", responsable_email: vocal.email, titulo: "Vencida", estado: "ASIGNADA", fecha_creacion: "2026-10-01", fecha_prevista_actuacion: "2026-10-21" },
    { id_incidencia: "CERRADA", responsable_email: vocal.email, estado: "CERRADA", fecha_prevista_actuacion: "2026-10-21" },
    { id_incidencia: "OTRA", responsable: vocal.id_usuario, responsable_email: "otra@example.invalid", estado: "EN_CURSO", fecha_prevista_actuacion: "2026-10-21" },
  ];
  const lib = entornoNotificaciones(filas);
  const avisos = lib.construirNotificaciones(vocal, filas, new Set(), new Date("2026-10-22T10:00:00Z"));
  assert.equal(avisos.length, 4);
  assert.equal(avisos.filter((aviso) => aviso.tipo === "ASIGNACION").length, 2);
  assert.equal(avisos.filter((aviso) => aviso.tipo === "PROXIMA").length, 1);
  assert.equal(avisos.filter((aviso) => aviso.tipo === "VENCIDA").length, 1);
  assert.equal(avisos[0].tipo, "VENCIDA");
});

test("lectura de notificaciones es privada, persistente e idempotente", async () => {
  const registros = [];
  const filas = [{ id_incidencia: "ASIGNADA", responsable_email: vocal.email, titulo: "Asignada", estado: "REGISTRADA", fecha_creacion: "2026-10-01" }];
  const lib = entornoNotificaciones(filas, registros);
  const inicial = await lib.obtenerNotificaciones(vocal);
  await assert.rejects(() => lib.marcarNotificacionesLeidas(admin, [inicial[0].id]), (error) => error.codigo === "PERMISO_DENEGADO");
  assert.equal(registros.length, 0);
  await lib.marcarNotificacionesLeidas(vocal, [inicial[0].id]);
  assert.equal((await lib.obtenerNotificaciones(vocal))[0].leida, true);
  await lib.marcarNotificacionesLeidas(vocal, [inicial[0].id]);
  assert.equal(registros.length, 1);
  filas[0].fecha_asignacion = "2026-10-22T10:00:00Z";
  assert.equal((await lib.obtenerNotificaciones(vocal))[0].leida, false);
});

test("contadores distinguen IDs duplicados y solo ADMIN/PRESIDENTE pueden consultarlos", async () => {
  let lecturas = 0;
  const usuarios = [{ ...vocal, nombre: "Vocal" }, { ...admin, id_usuario: vocal.id_usuario, nombre: "Administrador" }];
  const filas = [
    { id_incidencia: "NUEVA", usuario_creador: vocal.id_usuario, usuario_creador_email: vocal.email, responsable: vocal.id_usuario, responsable_email: admin.email, estado: "EN_CURSO" },
    { id_incidencia: "CERRADA", usuario_creador_email: vocal.email, responsable_email: admin.email, estado: "CERRADA" },
    { id_incidencia: "HISTORICA", usuario_creador: vocal.id_usuario, responsable: vocal.id_usuario, estado: "REGISTRADA" },
  ];
  const lib = cargar("src/lib/estadisticasUsuarios.ts", { "./constants": constantes, "./permissions": permisos, "./incidencias": entornoIncidencias([]),
    "./sheets": { leerFilasComoObjetos: async (hoja) => { lecturas++; return { filas: (hoja === "Usuarios" ? usuarios : filas).map((objeto) => ({ objeto })) }; } } });
  await assert.rejects(() => lib.obtenerEstadisticasUsuarios(vocal), (error) => error.codigo === "PERMISO_DENEGADO");
  await assert.rejects(() => lib.obtenerEstadisticasUsuarios({ ...admin, rol: "ADMINISTRADOR_FINCAS" }), (error) => error.codigo === "PERMISO_DENEGADO");
  assert.equal(lecturas, 0);
  for (const rol of ["ADMIN", "PRESIDENTE"]) {
    const datos = await lib.obtenerEstadisticasUsuarios({ ...admin, rol });
    assert.equal(datos.usuarios.find((usuario) => usuario.email === vocal.email).creadas, 2);
    const asignado = datos.usuarios.find((usuario) => usuario.email === admin.email);
    assert.equal(asignado.asignadas, 2);
    assert.equal(asignado.abiertas, 1);
    assert.equal(datos.sinIdentificar, 1);
  }
  assert.equal(permisos.tienePermiso({ ...admin, rol: "PRESIDENTE" }, "USUARIOS_GESTIONAR"), false);
});

test("reasignar actualiza la lectura y no devuelve una incidencia fuera de ámbito al responsable anterior", async () => {
  const fila = { id_incidencia: "REASIGNADA", usuario_creador: admin.id_usuario, usuario_creador_email: admin.email, responsable_email: vocal.email,
    responsable: vocal.id_usuario, fecha_asignacion: "2026-01-01", tipo_ubicacion: "BLOQUE", bloque: "B2", planta: "P1", estado: "ASIGNADA", titulo: "Revisión" };
  const lib = entornoIncidencias([fila]);
  assert.equal((await lib.listarIncidencias(vocal)).length, 1);
  await lib.actualizarIncidencia(admin, "REASIGNADA", { titulo: "Revisión", descripcion: "Revisar acceso", tipoUbicacion: "BLOQUE", bloque: "B2", planta: "P1", categoria: "FONT", prioridad: "MEDIA", responsableEmail: admin.email });
  assert.equal(fila.responsable_email, admin.email);
  assert.notEqual(fila.fecha_asignacion, "2026-01-01");
  assert.equal((await lib.listarIncidencias(vocal)).length, 0);
});

test("el directorio de responsables solo devuelve nombres y correos de cuentas activas", async () => {
  const filas = [{ ...vocal, nombre: "Vocal", password_hash: "no-exponer", version_sesion: "no-exponer" }, { ...admin, activo: false }];
  const lib = cargar("src/lib/asignaciones.ts", { "./constants": constantes, "./permissions": permisos,
    "./sheets": { leerFilasComoObjetos: async () => ({ filas: filas.map((objeto) => ({ objeto })) }) } });
  const usuarios = await lib.listarUsuariosAsignables(vocal);
  assert.equal(usuarios.length, 1);
  assert.equal(Object.keys(usuarios[0]).sort().join(","), "email,nombre");
  await assert.rejects(() => lib.resolverResponsable(vocal, admin.email));
});

test("los plazos usan el día de Madrid y omiten fechas históricas inválidas", () => {
  const filas = [
    { id_incidencia: "MANANA", responsable_email: vocal.email, estado: "EN_CURSO", fecha_prevista_actuacion: "2026-10-24" },
    { id_incidencia: "INVALIDA", responsable_email: vocal.email, estado: "EN_CURSO", fecha_prevista_actuacion: "2026-02-30" },
  ];
  const lib = entornoNotificaciones(filas);
  const avisos = lib.construirNotificaciones(vocal, filas, new Set(), new Date("2026-10-22T23:30:00Z"));
  assert.equal(avisos.filter((aviso) => aviso.tipo === "PROXIMA")[0].detalle, "El plazo de resolución vence en 1 día.");
  assert.equal(avisos.filter((aviso) => aviso.idIncidencia === "INVALIDA").length, 1);
});

test("IDs históricos repetidos no conceden propiedad ni asignación sin correo", () => {
  const actor = { ...vocal, id_unico: false };
  assert.equal(permisos.esResponsable(actor, { responsable: vocal.id_usuario }), false);
  assert.equal(permisos.esCreador(actor, { usuario_creador: vocal.id_usuario }), false);
  assert.equal(permisos.esResponsable(actor, { responsable: vocal.id_usuario, responsable_email: vocal.email }), true);
  assert.equal(permisos.esCreador(actor, { usuario_creador: vocal.id_usuario, usuario_creador_email: vocal.email }), true);
});

const base = { id_incidencia: "TEST-1", usuario_creador: vocal.id_usuario, tipo_ubicacion: "BLOQUE", bloque: "B1", estado: "EN_CURSO", fecha_creacion: "2026-01-10T23:59:59Z", fecha_ultima_modificacion: "2026-02-10T10:00:00Z", titulo: "Incidencia" };

test("archivado a los 15 días, conservación del estado y reapertura", async () => {
  const ahora = Date.now();
  const fecha = new Date(ahora - 15 * 86400000).toISOString();
  const fila = { ...base, estado: "RESUELTA", fecha_estado_final: fecha, fecha_resolucion: fecha };
  const lib = entornoIncidencias([fila]);
  assert.equal(lib.estaArchivada(fila, ahora), true);
  assert.equal(lib.estaArchivada(fila, ahora - 1), false);
  assert.equal((await lib.listarIncidencias(admin)).length, 0);
  const historico = await lib.listarIncidencias(admin, { incluirArchivadas: true });
  assert.equal(historico.length, 1);
  assert.equal(historico[0].estado, "RESUELTA");
  assert.equal(historico[0].archivada, true);
  await lib.cambiarEstadoIncidencia(admin, base.id_incidencia, "CERRADA");
  assert.equal(lib.estaArchivada(fila), false);
  await lib.cambiarEstadoIncidencia(admin, base.id_incidencia, "REABIERTA");
  assert.equal(fila.archivada, false);
  assert.equal(fila.fecha_estado_final, "");
  assert.equal(fila.fecha_resolucion, "");
});

test("ubicación y fechas inclusivas respetan el ámbito del vocal", async () => {
  const lib = entornoIncidencias([base, { ...base, id_incidencia: "TEST-2", bloque: "B2" },
    { ...base, id_incidencia: "TEST-3", tipo_ubicacion: "ZONA_COMUN", bloque: "", zona_comun: "PISCINA" }]);
  assert.equal((await lib.listarIncidencias(vocal, { bloque: "B2" })).length, 0);
  assert.equal((await lib.listarIncidencias(vocal, { bloque: "B1", zona: "PISCINA" })).length, 2);
  assert.equal((await lib.listarIncidencias(vocal, { fechaDesde: "2026-01-10", fechaHasta: "2026-01-10" })).length, 2);
  assert.equal((await lib.listarIncidencias(vocal, { fechaDesde: "2026-02-10", fechaHasta: "2026-02-10", campoFecha: "actividad" })).length, 2);
  assert.equal((await lib.listarIncidencias(vocal, { fechaDesde: "2026-02-10", campoFecha: "resolucion" })).length, 0);
  await assert.rejects(() => lib.listarIncidencias(admin, { fechaDesde: "2026-02-30" }));
  await assert.rejects(() => lib.listarIncidencias(admin, { fechaDesde: "2026-03-01", fechaHasta: "2026-01-01" }));
});

test("filtros compartidos no elevan visibilidad ni buscan contenido confidencial oculto", async () => {
  const lib = entornoIncidencias([{ ...base, usuario_creador: "OTRO", confidencial: true, descripcion: "secreto-test" }]);
  const filtros = lib.leerFiltrosIncidencias(new URLSearchParams("bloque=B1&fechaDesde=2026-01-01&incluirArchivadas=true"));
  assert.equal(filtros.bloque, "B1");
  assert.equal(filtros.incluirArchivadas, undefined);
  assert.equal((await lib.listarIncidencias(vocal, { texto: "secreto-test" })).length, 0);
  assert.equal((await lib.listarIncidencias(admin, { texto: "secreto-test" })).length, 1);
});

test("tarjetas y detalle muestran nombres completos de ubicación, planta y categoría", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Componente = cargar("src/components/UbicacionCategoriaIncidencia.tsx").default;
  const catalogos = {
    BLOQUES: [{ codigo: "B1", etiqueta: "Bloque 1" }], PLANTAS: [{ codigo: "P1", etiqueta: "Primera planta" }],
    ZONAS: [{ codigo: "PISC", etiqueta: "Piscina comunitaria" }], CATEGORIAS: [{ codigo: "FONT", etiqueta: "Fontanería" }],
  };
  const incidencia = { tipoUbicacion: "BLOQUE", bloque: "B1", planta: "P1", categoria: "FONT", ubicacionDetalle: "Portal derecho" };
  const bloque = renderToStaticMarkup(React.createElement(Componente, { incidencia, catalogos }));
  for (const texto of ["Bloque 1", "Primera planta", "Fontanería", "Portal derecho"]) assert.ok(bloque.includes(texto));
  const zona = renderToStaticMarkup(React.createElement(Componente, { incidencia: { ...incidencia, tipoUbicacion: "ZONA_COMUN", zonaComun: "PISC" }, catalogos }));
  assert.ok(zona.includes("Zona común"));
  assert.ok(zona.includes("Piscina comunitaria"));
});

test("deshabilitar el acceso local no bloquea el acceso Google por un cambio pendiente", async () => {
  const { usuarios } = entornoUsuarios({ ...vocal, acceso_password: false, cambio_password_obligatorio: true, password_hash: "hash-no-utilizado" });
  const usuario = await usuarios.buscarUsuarioPorEmail(vocal.email);
  assert.equal(usuario.acceso_password, false);
  assert.equal(usuario.cambio_password_obligatorio, false);
});

function entornoEliminacion({ archivos = [], falloBlob = false, existe = true } = {}) {
  const eventos = [];
  const datos = {
    Incidencias: [{ objeto: { id_incidencia: "INC-BORRAR" }, numeroFila: 4 }],
    Archivos: archivos.map((archivo, indice) => ({ objeto: { ...archivo, id_incidencia: "INC-BORRAR" }, numeroFila: indice + 2 })),
    Comentarios: [{ objeto: { id_incidencia: "INC-BORRAR" }, numeroFila: 7 }],
    Actuaciones: [{ objeto: { id_incidencia: "OTRA" }, numeroFila: 2 }, { objeto: { id_incidencia: "INC-BORRAR" }, numeroFila: 8 }],
    Notificaciones: [{ objeto: { id_incidencia: "INC-BORRAR" }, numeroFila: 3 }],
  };
  const lib = cargar("src/lib/eliminarIncidencia.ts", {
    "./constants": constantes, "./permissions": permisos,
    "./incidencias": { obtenerIncidenciaDetalle: async () => { eventos.push("consultar"); if (!existe) throw new permisos.ErrorAplicacion("NO_ENCONTRADO", "No existe"); } },
    "./sheets": {
      leerFilasComoObjetos: async (hoja) => ({ filas: datos[hoja] }),
      eliminarFilas: async (filas) => { eventos.push({ limpiar: filas }); },
    },
    "@vercel/blob": {
      list: async ({ prefix, cursor }) => {
        assert.equal(prefix, "incidencias/INC-BORRAR/");
        return cursor ? { blobs: [{ url: "https://blob.test/segunda.jpg" }], hasMore: false } :
          { blobs: [{ url: "https://blob.test/primera.jpg" }], hasMore: true, cursor: "pagina-2" };
      },
      del: async (urls) => { eventos.push({ blobs: urls }); if (falloBlob) throw new Error("Blob no disponible"); },
    },
    "./auditoria": { registrarAuditoria: async () => { eventos.push("auditar"); } },
  });
  return { eliminar: lib.eliminarIncidencia, eventos };
}

test("solo ADMIN elimina: todos los demás perfiles se rechazan antes de leer datos", async () => {
  for (const rol of ["VOCAL", "COORDINADOR", "PRESIDENTE", "ADMINISTRADOR_FINCAS"]) {
    const { eliminar, eventos } = entornoEliminacion();
    await assert.rejects(() => eliminar({ ...admin, rol }, "INC-BORRAR"), (error) => error.codigo === "PERMISO_DENEGADO");
    assert.equal(eventos.length, 0);
  }
});

test("eliminación borra blobs paginados y registros asociados, conservando otras incidencias", async () => {
  const { eliminar, eventos } = entornoEliminacion({ archivos: [{ url_blob: "https://blob.test/guardada.jpg" }, {}] });
  await eliminar(admin, "INC-BORRAR");
  assert.equal(eventos[0], "consultar");
  assert.equal(eventos[1].blobs.length, 3);
  assert.ok(eventos[1].blobs.includes("https://blob.test/guardada.jpg"));
  const filas = eventos[2].limpiar;
  assert.equal(filas.length, 6);
  assert.ok(filas.some((fila) => fila.hoja === "Incidencias" && fila.numeroFila === 4));
  assert.ok(filas.some((fila) => fila.hoja === "Actuaciones" && fila.numeroFila === 8));
  assert.equal(filas.some((fila) => fila.hoja === "Actuaciones" && fila.numeroFila === 2), false);
  assert.equal(eventos[3], "auditar");
});

test("si falla Blob, no se borra la incidencia ni sus registros", async () => {
  const { eliminar, eventos } = entornoEliminacion({ archivos: [{ url_blob: "https://blob.test/guardada.jpg" }], falloBlob: true });
  await assert.rejects(() => eliminar(admin, "INC-BORRAR"));
  assert.equal(eventos.some((evento) => evento.limpiar), false);
  assert.equal(eventos.includes("auditar"), false);
});

test("sin adjuntos no se necesita Blob; una incidencia inexistente no borra nada", async () => {
  const { eliminar, eventos } = entornoEliminacion();
  await eliminar(admin, "INC-BORRAR");
  assert.equal(eventos.some((evento) => evento.blobs), false);
  assert.equal(eventos[1].limpiar.length, 4);
  const inexistente = entornoEliminacion({ existe: false });
  await assert.rejects(() => inexistente.eliminar(admin, "INC-BORRAR"), (error) => error.codigo === "NO_ENCONTRADO");
  assert.equal(inexistente.eventos.length, 1);
});

test("limpiar filas conserva cabeceras y usa una sola operación sin desplazar otras filas", async () => {
  const peticiones = [];
  const sheets = cargar("src/lib/sheets.ts", { googleapis: { google: {
    auth: { JWT: class { async authorize() {} } },
    sheets: () => ({ spreadsheets: { values: { batchClear: async (peticion) => { peticiones.push(peticion); } } } }),
  } } });
  await sheets.eliminarFilas([{ hoja: "Incidencias", numeroFila: 4 }, { hoja: "Archivos", numeroFila: 7 }]);
  assert.equal(peticiones.length, 1);
  assert.equal(peticiones[0].requestBody.ranges.join(","), "Incidencias!4:4,Archivos!7:7");
  await assert.rejects(() => sheets.eliminarFilas([{ hoja: "Incidencias", numeroFila: 1 }]));
  await sheets.eliminarFilas([]);
  assert.equal(peticiones.length, 1);
});

test("cambiar contraseña distingue cuentas con el mismo ID y no modifica la otra cuenta", async () => {
  const otraCuenta = { ...admin, id_usuario: vocal.id_usuario, acceso_password: false, version_sesion: "sesion-google" };
  const fila = { ...vocal, acceso_password: true, cambio_password_obligatorio: true,
    password_hash: await claves.crearHashPassword(passwordPrueba), version_sesion: "sesion-vocal" };
  const { usuarios, escrituras } = entornoUsuarios(fila, [otraCuenta]);
  const actor = await usuarios.buscarUsuarioPorEmail(vocal.email);
  await assert.rejects(() => usuarios.cambiarPasswordPropia(actor, "incorrecta", "Nueva-password-local-123"));
  assert.equal(escrituras.length, 0);
  await usuarios.cambiarPasswordPropia(actor, passwordPrueba, "Nueva-password-local-123");
  assert.equal(fila.cambio_password_obligatorio, false);
  assert.ok(await claves.comprobarPassword("Nueva-password-local-123", fila.password_hash));
  assert.equal(otraCuenta.password_hash, undefined);
  assert.equal(otraCuenta.version_sesion, "sesion-google");
  assert.equal(escrituras.length, 1);
});

test("resetear distingue correos con el mismo ID y rechaza solicitudes ambiguas", async () => {
  const otraCuenta = { ...admin, id_usuario: vocal.id_usuario, acceso_password: false, version_sesion: "sesion-google" };
  const fila = { ...vocal };
  const { usuarios, escrituras } = entornoUsuarios(fila, [otraCuenta]);
  await assert.rejects(() => usuarios.resetearPassword(admin, vocal.id_usuario), (error) => error.codigo === "DATOS_INVALIDOS");
  assert.equal(escrituras.length, 0);
  const temporal = await usuarios.resetearPassword(admin, vocal.id_usuario, vocal.email);
  assert.ok(await claves.comprobarPassword(temporal, fila.password_hash));
  assert.equal(otraCuenta.password_hash, undefined);
  assert.equal(otraCuenta.version_sesion, "sesion-google");
});

test("editar una cuenta con ID repetido conserva su propia contraseña", async () => {
  const otraCuenta = { ...admin, id_usuario: vocal.id_usuario, acceso_password: false };
  const fila = { ...vocal, acceso_password: true, password_hash: await claves.crearHashPassword(passwordPrueba) };
  const hash = fila.password_hash;
  const { usuarios } = entornoUsuarios(fila, [otraCuenta]);
  await usuarios.guardarUsuario(admin, { email: vocal.email, nombre: "Vocal editado", rol: "VOCAL", accesoPassword: true });
  assert.equal(fila.password_hash, hash);
  assert.equal(fila.nombre, "Vocal editado");
  assert.equal(otraCuenta.password_hash, undefined);
});