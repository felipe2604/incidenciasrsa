import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

function obtenerAuth() {
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function obtenerApiSheets() {
  const auth = obtenerAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function columnaAIndiceLetra(indiceBase0: number) {
  let n = indiceBase0 + 1;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

// Fila cruda tal y como la devuelve la API de Sheets: claves = cabeceras,
// valores sin tipar hasta que se castea al interface de dominio (Usuario,
// Incidencia...) que corresponda. `any` está justificado aquí porque este es
// el único punto de la capa de datos donde conviven todas las hojas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FilaCruda = Record<string, any>;

export interface FilaConIndice {
  objeto: FilaCruda;
  numeroFila: number;
}

// Equivalente a leerFilasComoObjetos_ de Utilidades.gs.
export async function leerFilasComoObjetos(
  nombreHoja: string
): Promise<{ encabezados: string[]; filas: FilaConIndice[] }> {
  const sheets = await obtenerApiSheets();
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: nombreHoja });
  const datos = resp.data.values || [];
  if (datos.length < 1) return { encabezados: [], filas: [] };
  const encabezados = datos[0] as string[];
  const filas: FilaConIndice[] = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (!fila || fila.join("") === "") continue;
    const objeto: FilaCruda = {};
    encabezados.forEach((campo, idx) => {
      objeto[campo] = fila[idx];
    });
    filas.push({ objeto, numeroFila: i + 1 });
  }
  return { encabezados, filas };
}

export async function obtenerEncabezados(nombreHoja: string): Promise<string[]> {
  const sheets = await obtenerApiSheets();
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${nombreHoja}!1:1` });
  return (resp.data.values && (resp.data.values[0] as string[])) || [];
}

// Añade una fila nueva ordenando los valores según las cabeceras reales de la hoja.
export async function agregarFila(
  nombreHoja: string,
  encabezados: string[],
  valoresPorCampo: FilaCruda
): Promise<void> {
  const sheets = await obtenerApiSheets();
  const fila = encabezados.map((campo) => valoresPorCampo[campo] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: nombreHoja,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [fila] },
  });
}

// Equivalente a actualizarCelda_: solo toca las columnas indicadas en "cambios".
export async function actualizarCelda(
  nombreHoja: string,
  numeroFila: number,
  encabezados: string[],
  cambios: FilaCruda
): Promise<void> {
  const data = Object.entries(cambios)
    .map(([campo, valor]) => {
      const col = encabezados.indexOf(campo);
      if (col === -1) return null;
      return { range: `${nombreHoja}!${columnaAIndiceLetra(col)}${numeroFila}`, values: [[valor]] };
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((x): x is { range: string; values: any[][] } => x !== null);
  if (data.length === 0) return;
  const sheets = await obtenerApiSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}

// Contador correlativo (INC000001, ACT000001...) guardado en la pestaña
// Configuracion. A diferencia de Apps Script (LockService), la API de Sheets no
// ofrece bloqueo real: se usa reintento optimista, suficiente para el volumen
// de una comunidad de vecinos. Si el volumen de altas simultáneas creciera
// mucho, sustituir por un lock distribuido (p. ej. Vercel KV) antes de escalar.
export async function generarSiguienteId(prefijo: string): Promise<string> {
  const sheets = await obtenerApiSheets();
  for (let intento = 0; intento < 5; intento++) {
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: HOJAS_CONFIGURACION });
    const datos = resp.data.values || [];
    const encabezados = (datos[0] || []) as string[];
    const colClave = encabezados.indexOf("clave");
    const colCodigo = encabezados.indexOf("codigo");
    const colValorExtra = encabezados.indexOf("valor_extra");
    let filaEncontrada = -1;
    let valorActual = 0;
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][colClave] === "CONTADOR" && datos[i][colCodigo] === prefijo) {
        filaEncontrada = i + 1;
        valorActual = Number(datos[i][colValorExtra] || 0);
        break;
      }
    }
    const siguiente = valorActual + 1;
    try {
      if (filaEncontrada > -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${HOJAS_CONFIGURACION}!${columnaAIndiceLetra(colValorExtra)}${filaEncontrada}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[siguiente]] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: HOJAS_CONFIGURACION,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["CONTADOR", prefijo, `Contador ${prefijo}`, 0, true, siguiente]] },
        });
      }
      return prefijo + String(siguiente).padStart(6, "0");
    } catch (e) {
      if (intento === 4) throw e;
    }
  }
  throw new Error("No se pudo generar el identificador.");
}

const HOJAS_CONFIGURACION = "Configuracion";
