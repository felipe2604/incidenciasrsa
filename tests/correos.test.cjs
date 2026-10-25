const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function cargar(archivo, imports = {}) {
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(codigo, { exports, Buffer, process: { env: { GOOGLE_SHEETS_SPREADSHEET_ID: "TEST" } }, require: (nombre) => imports[nombre] || require(nombre) });
  return exports;
}

const constantes = cargar("src/lib/constants.ts");
const permisos = cargar("src/lib/permissions.ts", { "./constants": constantes });
const admin = { id_usuario: "A", email: "admin@example.invalid", rol: "ADMIN" };

function entornoCorreos(filas) {
  const borradas = [];
  const lib = cargar("src/lib/mails.ts", {
    "./constants": constantes, "./permissions": permisos, "./auditoria": { registrarAuditoria: async () => {} },
    "./sheets": {
      leerFilasComoObjetos: async () => ({ filas: filas.map((objeto, indice) => ({ objeto, numeroFila: indice + 2 })) }),
      eliminarFilaHoja: async (hoja, fila) => { borradas.push({ hoja, fila }); filas.splice(fila - 2, 1); },
    },
  });
  return { lib, borradas };
}

const correos = () => [
  { fecha: "1", remitente: "a@example.invalid", asunto: "Primero", cuerpo: "Uno" },
  { fecha: "2", remitente: "b@example.invalid", asunto: "Segundo", cuerpo: "Dos" },
];

test("solo ADMIN y PRESIDENTE gestionan correos", async () => {
  for (const rol of ["VOCAL", "COORDINADOR", "ADMINISTRADOR_FINCAS"]) {
    const { lib } = entornoCorreos(correos());
    await assert.rejects(() => lib.listarCorreos({ ...admin, rol }), (error) => error.codigo === "PERMISO_DENEGADO");
  }
  for (const rol of ["ADMIN", "PRESIDENTE"]) {
    const { lib } = entornoCorreos(correos());
    const lista = await lib.listarCorreos({ ...admin, rol });
    assert.equal(lista[0].asunto, "Segundo");
    assert.match(lista[0].id, /^[a-f0-9]{32}$/);
  }
});

test("eliminar borra la fila correcta aunque otras filas se hayan desplazado", async () => {
  const filas = correos();
  const { lib, borradas } = entornoCorreos(filas);
  const lista = await lib.listarCorreos(admin);
  const segundo = lista.find((correo) => correo.asunto === "Segundo");
  filas.shift();
  await lib.eliminarCorreo(admin, segundo.id);
  assert.equal(JSON.stringify(borradas), JSON.stringify([{ hoja: "Mails", fila: 2 }]));
  assert.equal(filas.length, 0);
  await assert.rejects(() => lib.eliminarCorreo(admin, segundo.id), (error) => error.codigo === "NO_ENCONTRADO");
});

test("el borrado físico localiza la pestaña y protege las cabeceras", async () => {
  const peticiones = [];
  const sheets = cargar("src/lib/sheets.ts", { googleapis: { google: {
    auth: { JWT: class { async authorize() {} } },
    sheets: () => ({ spreadsheets: {
      get: async () => ({ data: { sheets: [{ properties: { title: "Usuarios", sheetId: 1 } }, { properties: { title: "Mails", sheetId: 7 } }] } }),
      batchUpdate: async (peticion) => peticiones.push(peticion),
    } }),
  } } });
  await sheets.eliminarFilaHoja("Mails", 5);
  assert.equal(JSON.stringify(peticiones[0].requestBody.requests[0].deleteDimension.range), JSON.stringify({ sheetId: 7, dimension: "ROWS", startIndex: 4, endIndex: 5 }));
  await assert.rejects(() => sheets.eliminarFilaHoja("Mails", 1));
  await assert.rejects(() => sheets.eliminarFilaHoja("Inexistente", 3));
});

test("añadir una cabecera amplía la cuadrícula si no quedan columnas", async () => {
  const peticiones = [];
  const actualizaciones = [];
  const sheets = cargar("src/lib/sheets.ts", { googleapis: { google: {
    auth: { JWT: class { async authorize() {} } },
    sheets: () => ({ spreadsheets: {
      get: async () => ({ data: { sheets: [{ properties: { title: "Incidencias", sheetId: 3, gridProperties: { columnCount: 2 } } }] } }),
      batchUpdate: async (peticion) => peticiones.push(peticion),
      values: {
        get: async () => ({ data: { values: [["a", "b"]] } }),
        update: async (peticion) => actualizaciones.push(peticion),
      },
    } }),
  } } });
  const encabezados = await sheets.obtenerEncabezados("Incidencias", ["b", "c", "d"]);
  assert.equal(encabezados.join(","), "a,b,c,d");
  assert.equal(JSON.stringify(peticiones[0].requestBody.requests[0].appendDimension), JSON.stringify({ sheetId: 3, dimension: "COLUMNS", length: 2 }));
  assert.equal(actualizaciones[0].range, "Incidencias!C1");
  await sheets.obtenerEncabezados("Incidencias", ["a"]);
  assert.equal(peticiones.length, 1);
});

test("el menú marca la sección más específica", () => {
  const { hrefActivo } = cargar("src/lib/navegacion.ts");
  const hrefs = ["/incidencias/panel", "/incidencias", "/incidencias/correos"];
  assert.equal(hrefActivo("/incidencias/correos", hrefs), "/incidencias/correos");
  assert.equal(hrefActivo("/incidencias/INC000001", hrefs), "/incidencias");
  assert.equal(hrefActivo("/incidencias", hrefs), "/incidencias");
  assert.equal(hrefActivo("/login", hrefs), undefined);
});

test("el creador se resuelve por correo y no por IDs repetidos", async () => {
  const usuarios = [
    { id_usuario: "U2", email: "ana@example.invalid", nombre: "Ana" },
    { id_usuario: "U2", email: "luis@example.invalid", nombre: "Luis" },
    { id_usuario: "U3", email: "eva@example.invalid", nombre: "Eva" },
  ];
  const lib = cargar("src/lib/incidencias.ts", {
    "./constants": constantes, "./permissions": permisos, "./validaciones": {}, "./auditoria": {}, "./asignaciones": {},
    "./sheets": { leerFilasComoObjetos: async () => ({ filas: usuarios.map((objeto) => ({ objeto })) }) },
  });
  const nombre = await lib.obtenerResolverNombres();
  assert.equal(nombre("U2", "LUIS@example.invalid"), "Luis");
  assert.equal(nombre("U2"), "Desconocido");
  assert.equal(nombre("U3"), "Eva");
});
