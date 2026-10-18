const Module = require("node:module");
const { scryptSync } = require("node:crypto");

if (process.env.RSA_BROWSER_TESTS !== "1") throw new Error("Este entorno solo puede iniciarse para pruebas locales explícitas.");

const salt = "12".repeat(16);
const hash = `scrypt$${salt}$${scryptSync("Pruebas-locales-2026", salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex")}`;
const fecha = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
function tabla(filas, columnas = []) {
  const encabezados = [...new Set([...columnas, ...filas.flatMap((fila) => Object.keys(fila))])];
  return [encabezados, ...filas.map((fila) => encabezados.map((columna) => fila[columna] ?? ""))];
}

const hojas = {
  Usuarios: tabla([
    { id_usuario: "UADMIN", email: "admin@example.invalid", nombre: "Administrador de prueba", rol: "ADMIN", activo: true, acceso_password: true, password_hash: hash, cambio_password_obligatorio: false, version_sesion: "test-admin" },
    { id_usuario: "UVOCAL", email: "vocal@example.invalid", nombre: "Vocal de prueba", rol: "VOCAL", ambito_bloques: "B1", ambito_zonas: "PISCINA", activo: true, acceso_password: true, password_hash: hash, cambio_password_obligatorio: true, version_sesion: "test-vocal" },
  ]),
  Configuracion: tabla([
    { clave: "PARAMETRO", codigo: "ACCESO_BLOQUEADO", valor_extra: "FALSE" },
    { clave: "CONTADOR", codigo: "U", valor_extra: 10 },
    { clave: "BLOQUE", codigo: "B1", etiqueta: "Bloque 1 · Portal principal", activo: true },
    { clave: "BLOQUE", codigo: "B2", etiqueta: "Bloque 2", activo: true },
    { clave: "PLANTA", codigo: "P1", etiqueta: "Primera planta", activo: true },
    { clave: "ZONA", codigo: "PISCINA", etiqueta: "Piscina comunitaria", activo: true },
    { clave: "CATEGORIA", codigo: "FONT", etiqueta: "Fontanería", activo: true },
    { clave: "CATEGORIA", codigo: "LIM", etiqueta: "Limpieza y mantenimiento", activo: true },
  ]),
  Incidencias: tabla([
    { id_incidencia: "INC-PRUEBA-1", usuario_creador: "UADMIN", titulo: "Fuga en el portal principal", descripcion: "Revisar la llave de paso del acceso.", tipo_ubicacion: "BLOQUE", bloque: "B1", planta: "P1", categoria: "FONT", estado: "PENDIENTE_REVISION", prioridad: "ALTA", fecha_creacion: fecha(2), fecha_ultima_modificacion: fecha(1), confidencial: false, archivada: false },
    { id_incidencia: "INC-PRUEBA-2", usuario_creador: "UVOCAL", titulo: "Limpieza de la piscina comunitaria", descripcion: "Limpieza de zonas de acceso.", tipo_ubicacion: "ZONA_COMUN", zona_comun: "PISCINA", categoria: "LIM", estado: "EN_CURSO", prioridad: "MEDIA", fecha_creacion: fecha(5), fecha_ultima_modificacion: fecha(1), confidencial: false, archivada: false },
    { id_incidencia: "INC-PRUEBA-3", usuario_creador: "UADMIN", titulo: "Avería resuelta del Bloque 2", descripcion: "Reparación completada.", tipo_ubicacion: "BLOQUE", bloque: "B2", categoria: "FONT", estado: "RESUELTA", prioridad: "BAJA", fecha_creacion: fecha(40), fecha_ultima_modificacion: fecha(20), fecha_resolucion: fecha(20), fecha_estado_final: fecha(20), archivada: false },
  ]),
  Archivos: tabla([], ["id_archivo", "id_incidencia", "eliminado"]),
  Comentarios: tabla([], ["id_comentario", "id_incidencia", "texto", "fecha", "usuario"]),
  Auditoria: tabla([], ["id_auditoria", "fecha", "accion", "entidad", "id_entidad", "detalle", "resultado"]),
};

function celda(rango) {
  const [nombre, coordenadas] = rango.split("!");
  const match = /^([A-Z]+)(\d+)/.exec(coordenadas || "");
  if (!match) throw new Error(`Rango de prueba no admitido: ${rango}`);
  let columna = 0;
  for (const letra of match[1]) columna = columna * 26 + letra.charCodeAt(0) - 64;
  return { nombre, fila: Number(match[2]) - 1, columna: columna - 1 };
}

function escribir(rango, valores) {
  const posicion = celda(rango);
  const hoja = hojas[posicion.nombre];
  valores.forEach((fila, desplazamiento) => {
    const destino = hoja[posicion.fila + desplazamiento] ||= [];
    fila.forEach((valor, indice) => { destino[posicion.columna + indice] = valor; });
  });
}

const values = {
  async get({ range }) {
    const hoja = hojas[range.split("!")[0]];
    if (!hoja) throw new Error(`Hoja de prueba no definida: ${range}`);
    return { data: { values: JSON.parse(JSON.stringify(range.endsWith("!1:1") ? [hoja[0]] : hoja)) } };
  },
  async update({ range, requestBody }) { escribir(range, requestBody.values); return { data: {} }; },
  async append({ range, requestBody }) { hojas[range].push(...requestBody.values); return { data: {} }; },
  async batchUpdate({ requestBody }) {
    requestBody.data.forEach((cambio) => escribir(cambio.range, cambio.values));
    return { data: {} };
  },
};

const original = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "googleapis") return { google: {
    auth: { JWT: class { async authorize() {} } },
    sheets: () => ({ spreadsheets: { values } }),
  } };
  return original.call(this, request, parent, isMain);
};