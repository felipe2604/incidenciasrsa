import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarComentarios, obtenerIncidenciaDetalle } from "@/lib/incidencias";
import { listarArchivosPorIncidencia } from "@/lib/archivos";
import { tienePermiso } from "@/lib/permissions";
import { obtenerCatalogos } from "@/lib/catalogos";
import { TRANSICIONES_ESTADO, type Estado } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import FormularioComentario from "@/components/FormularioComentario";
import CambiarEstadoIncidencia from "@/components/CambiarEstadoIncidencia";
import ModalEditarIncidencia from "@/components/ModalEditarIncidencia";

export default async function DetalleIncidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let actor;
  try {
    actor = await obtenerUsuarioActual();
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }

  let incidencia;
  try {
    incidencia = await obtenerIncidenciaDetalle(actor, id);
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }

  const [comentarios, archivos, catalogos] = await Promise.all([
    listarComentarios(actor, id),
    listarArchivosPorIncidencia(actor, id),
    obtenerCatalogos(),
  ]);
  // Solo se exponen campos no sensibles de cada archivo: la URL real del blob
  // nunca llega al navegador, las descargas pasan por /api/archivos/[id]/descarga.
  const archivosSeguro = archivos.map((a) => ({
    idArchivo: a.id_archivo as string,
    nombreOriginal: a.nombre_original as string,
  }));

  const puedeCambiarEstado = tienePermiso(actor, "INCIDENCIAS_CAMBIAR_ESTADO");
  const transicionesPosibles = TRANSICIONES_ESTADO[incidencia.estado as Estado] || [];
  const puedeEditar =
    tienePermiso(actor, "INCIDENCIAS_EDITAR") ||
    (tienePermiso(actor, "INCIDENCIAS_EDITAR_PROPIO_AMBITO") && incidencia.usuarioCreador === actor.id_usuario);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold">{incidencia.titulo}</h2>
          {puedeEditar && (
            <ModalEditarIncidencia
              idIncidencia={incidencia.idIncidencia}
              catalogos={catalogos}
              valoresIniciales={{
                titulo: incidencia.titulo,
                descripcion: incidencia.descripcion,
                tipoUbicacion: incidencia.tipoUbicacion,
                bloque: incidencia.bloque,
                planta: incidencia.planta,
                zonaComun: incidencia.zonaComun,
                ubicacionDetalle: incidencia.ubicacionDetalle,
                categoria: incidencia.categoria,
                prioridad: incidencia.prioridad,
                confidencial: incidencia.confidencial,
              }}
            />
          )}
        </div>
        <p className="text-sm text-gray-500">
          {incidencia.idIncidencia} · {incidencia.categoria} · {incidencia.prioridad}
        </p>
        <span className="mt-2 inline-block rounded-full bg-marca-200 px-3 py-1 text-sm">{incidencia.estado}</span>
      </div>
      <p className="whitespace-pre-wrap">{incidencia.descripcion}</p>


      {puedeCambiarEstado && transicionesPosibles.length > 0 && (
        <CambiarEstadoIncidencia idIncidencia={incidencia.idIncidencia} transicionesPosibles={transicionesPosibles} />
      )}

      <section>
        <h3 className="mb-2 font-semibold">Archivos adjuntos</h3>
        {archivosSeguro.length === 0 ? (
          <p className="text-sm text-gray-500">Sin archivos.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {archivosSeguro.map((a) => (
              <li key={a.idArchivo}>
                <a
                  className="text-marca-600 underline"
                  href={`/api/archivos/${a.idArchivo}/descarga`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.nombreOriginal}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Comentarios</h3>
        <ul className="flex flex-col gap-2">
          {comentarios.map((c) => (
            <li key={c.id_comentario} className="rounded-md bg-marca-100/30 p-2 text-sm">
              <p>{c.texto}</p>
              <p className="text-xs text-gray-500">
                {c.usuario} · {new Date(c.fecha).toLocaleString("es-ES")}
              </p>
            </li>
          ))}
        </ul>
        <FormularioComentario idIncidencia={incidencia.idIncidencia} />
      </section>
    </div>
  );
}
