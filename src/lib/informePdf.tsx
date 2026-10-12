import { readFileSync } from "fs";
import { join } from "path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { ETIQUETAS_ESTADO, TIPO_UBICACION, type OpcionCatalogo } from "./constants";
import { formatearMoneda, type ResumenInformes } from "./informes";

const logoBuffer = readFileSync(join(process.cwd(), "public", "logo.png"));

function mapaEtiquetas(lista: OpcionCatalogo[]): Record<string, string> {
  return Object.fromEntries(lista.map((o) => [o.codigo, o.etiqueta]));
}

const COLOR_MARCA = "#9d0208";
const COLOR_GRIS = "#6b7280";
const COLOR_BORDE = "#f3d9b1";

const estilos = StyleSheet.create({
  pagina: { paddingTop: 32, paddingBottom: 40, paddingHorizontal: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: COLOR_MARCA,
    paddingBottom: 10,
    marginBottom: 14,
  },
  logo: { width: 150, objectFit: "contain" },
  tituloBloque: { alignItems: "flex-end" },
  titulo: { fontSize: 17, fontWeight: 700, color: COLOR_MARCA },
  subtitulo: { fontSize: 9, color: COLOR_GRIS, marginTop: 2 },
  filtros: { fontSize: 8, color: COLOR_GRIS, marginBottom: 12, fontStyle: "italic" },
  tarjetas: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tarjeta: {
    borderWidth: 1,
    borderColor: COLOR_BORDE,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: "15.5%",
    alignItems: "center",
  },
  tarjetaValor: { fontSize: 12, fontWeight: 700, color: COLOR_MARCA },
  tarjetaEtiqueta: { fontSize: 6.5, color: COLOR_GRIS, textAlign: "center", marginTop: 2 },
  seccionTitulo: { fontSize: 11, fontWeight: 700, color: COLOR_MARCA, marginBottom: 6 },
  tabla: { borderWidth: 1, borderColor: COLOR_BORDE, borderRadius: 3 },
  filaCabecera: { flexDirection: "row", backgroundColor: COLOR_MARCA, paddingVertical: 5 },
  filaCabeceraTexto: { fontSize: 7.5, fontWeight: 700, color: "#ffffff", paddingHorizontal: 3 },
  fila: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: COLOR_BORDE, paddingVertical: 4 },
  filaAlterna: { backgroundColor: "#fdf2e3" },
  celda: { fontSize: 7.5, paddingHorizontal: 3 },
  colId: { width: "9%" },
  colFecha: { width: "8%" },
  colTitulo: { width: "21%" },
  colUbicacion: { width: "14%" },
  colCategoria: { width: "10%" },
  colPrioridad: { width: "8%" },
  colEstado: { width: "12%" },
  colResponsable: { width: "10%" },
  colCoste: { width: "8%", textAlign: "right" },
  piePagina: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLOR_GRIS,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDE,
    paddingTop: 4,
  },
});

interface CatalogosInforme {
  BLOQUES: OpcionCatalogo[];
  ZONAS: OpcionCatalogo[];
  CATEGORIAS: OpcionCatalogo[];
}

function etiquetaUbicacion(
  i: ResumenInformes["incidencias"][number],
  etiquetasBloque: Record<string, string>,
  etiquetasZona: Record<string, string>
): string {
  if (i.tipoUbicacion === TIPO_UBICACION.BLOQUE) {
    return [etiquetasBloque[i.bloque] || i.bloque, i.planta].filter(Boolean).join(" · ");
  }
  return etiquetasZona[i.zonaComun] || i.zonaComun;
}

function DocumentoInforme({
  resumen,
  catalogos,
  filtrosAplicados,
}: {
  resumen: ResumenInformes;
  catalogos: CatalogosInforme;
  filtrosAplicados: string[];
}) {
  const etiquetasBloque = mapaEtiquetas(catalogos.BLOQUES);
  const etiquetasZona = mapaEtiquetas(catalogos.ZONAS);
  const etiquetasCategoria = mapaEtiquetas(catalogos.CATEGORIAS);
  const fechaGeneracion = new Date().toLocaleString("es-ES");

  const tarjetas = [
    { etiqueta: "Total incidencias", valor: String(resumen.totalIncidencias) },
    { etiqueta: "Abiertas", valor: String(resumen.abiertas) },
    { etiqueta: "Vencidas", valor: String(resumen.vencidas) },
    { etiqueta: "Tiempo medio resolución (días)", valor: String(resumen.tiempoMedioResolucionDias) },
    { etiqueta: "Coste estimado total", valor: formatearMoneda(resumen.costeEstimadoTotal) },
    { etiqueta: "Coste real total", valor: formatearMoneda(resumen.costeRealTotal) },
  ];

  return (
    <Document title="Informe de incidencias - Residencial Santa Aurelia">
      <Page size="A4" style={estilos.pagina} wrap>
        <View style={estilos.cabecera} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- componente Image de @react-pdf/renderer, no renderiza DOM/HTML */}
          <Image src={{ data: logoBuffer, format: "png" }} style={estilos.logo} />
          <View style={estilos.tituloBloque}>
            <Text style={estilos.titulo}>Informe de incidencias</Text>
            <Text style={estilos.subtitulo}>Residencial Santa Aurelia</Text>
            <Text style={estilos.subtitulo}>Generado el {fechaGeneracion}</Text>
          </View>
        </View>

        {filtrosAplicados.length > 0 && <Text style={estilos.filtros}>Filtros aplicados: {filtrosAplicados.join(" · ")}</Text>}

        <Text style={estilos.seccionTitulo}>Resumen</Text>
        <View style={estilos.tarjetas}>
          {tarjetas.map((t) => (
            <View key={t.etiqueta} style={estilos.tarjeta}>
              <Text style={estilos.tarjetaValor}>{t.valor}</Text>
              <Text style={estilos.tarjetaEtiqueta}>{t.etiqueta}</Text>
            </View>
          ))}
        </View>

        <Text style={estilos.seccionTitulo}>Detalle de incidencias ({resumen.incidencias.length})</Text>
        <View style={estilos.tabla}>
          <View style={estilos.filaCabecera} fixed>
            <Text style={[estilos.filaCabeceraTexto, estilos.colId]}>ID</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colFecha]}>Fecha</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colTitulo]}>Título</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colUbicacion]}>Ubicación</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colCategoria]}>Categoría</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colPrioridad]}>Prioridad</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colEstado]}>Estado</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colResponsable]}>Responsable</Text>
            <Text style={[estilos.filaCabeceraTexto, estilos.colCoste]}>Coste real</Text>
          </View>
          {resumen.incidencias.map((i, indice) => (
            <View key={i.idIncidencia} style={[estilos.fila, ...(indice % 2 === 1 ? [estilos.filaAlterna] : [])]} wrap={false}>
              <Text style={[estilos.celda, estilos.colId]}>{i.idIncidencia}</Text>
              <Text style={[estilos.celda, estilos.colFecha]}>{i.fechaCreacion.slice(0, 10)}</Text>
              <Text style={[estilos.celda, estilos.colTitulo]}>{i.titulo}</Text>
              <Text style={[estilos.celda, estilos.colUbicacion]}>{etiquetaUbicacion(i, etiquetasBloque, etiquetasZona)}</Text>
              <Text style={[estilos.celda, estilos.colCategoria]}>{etiquetasCategoria[i.categoria] || i.categoria}</Text>
              <Text style={[estilos.celda, estilos.colPrioridad]}>{i.prioridad}</Text>
              <Text style={[estilos.celda, estilos.colEstado]}>{ETIQUETAS_ESTADO[i.estado] || i.estado}</Text>
              <Text style={[estilos.celda, estilos.colResponsable]}>{i.responsable || "—"}</Text>
              <Text style={[estilos.celda, estilos.colCoste]}>{formatearMoneda(Number(i.costeReal) || 0)}</Text>
            </View>
          ))}
          {resumen.incidencias.length === 0 && <Text style={[estilos.celda, { padding: 8 }]}>Sin incidencias para los filtros seleccionados.</Text>}
        </View>

        <View style={estilos.piePagina} fixed>
          <Text>Incidencias RSA · Residencial Santa Aurelia</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generarPdfInformeIncidencias(
  resumen: ResumenInformes,
  catalogos: CatalogosInforme,
  filtrosAplicados: string[]
): Promise<Buffer> {
  return renderToBuffer(<DocumentoInforme resumen={resumen} catalogos={catalogos} filtrosAplicados={filtrosAplicados} />);
}
