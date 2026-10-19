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

function entornoIncidencias(filas) {
  return cargar("src/lib/incidencias.ts", {
    "./constants": constantes, "./permissions": permisos, "./validaciones": {},
    "./auditoria": { registrarAuditoria: async () => {} },
    "./sheets": {
      leerFilasComoObjetos: async () => ({ encabezados: [], filas: filas.map((objeto, indice) => ({ objeto, numeroFila: indice + 2 })) }),
      obtenerEncabezados: async () => [],
      actualizarCelda: async (_hoja, indice, _encabezados, cambios) => Object.assign(filas[indice - 2], cambios),
    },
  });
}

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