import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarComentarios, obtenerIncidenciaDetalle } from "@/lib/incidencias";
import { listarArchivosPorIncidencia } from "@/lib/archivos";
import { puedeCambiarEstado, tienePermiso } from "@/lib/permissions";
import { obtenerCatalogos } from "@/lib/catalogos";
import { TRANSICIONES_ESTADO, ETIQUETAS_ESTADO, COLORES_ESTADO, ROLES, type Estado } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import FormularioComentario from "@/components/FormularioComentario";
import CambiarEstadoIncidencia from "@/components/CambiarEstadoIncidencia";
import ModalEditarIncidencia from "@/components/ModalEditarIncidencia";
import UbicacionCategoriaIncidencia from "@/components/UbicacionCategoriaIncidencia";
import EliminarIncidenciaBoton from "@/components/EliminarIncidenciaBoton";

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
    tipoMime: a.tipo_mime as string,
  }));

  const puedeCambiarEstadoActual = puedeCambiarEstado(actor, incidencia.usuarioCreador);
  const transicionesPosibles = TRANSICIONES_ESTADO[incidencia.estado as Estado] || [];
  const puedeEditar =
    tienePermiso(actor, "INCIDENCIAS_EDITAR") ||
    (tienePermiso(actor, "INCIDENCIAS_EDITAR_PROPIO_AMBITO") && incidencia.usuarioCreador === actor.id_usuario);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-marca-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 basis-48 break-words text-xl font-semibold">{incidencia.titulo}</h2>
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
          {actor.rol === ROLES.ADMIN && <EliminarIncidenciaBoton idIncidencia={incidencia.idIncidencia} titulo={incidencia.titulo} />}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {incidencia.idIncidencia} · Prioridad {incidencia.prioridad}
        </p>
        <UbicacionCategoriaIncidencia incidencia={incidencia} catalogos={catalogos} />
        <span
          className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${
            COLORES_ESTADO[incidencia.estado as Estado] || "bg-marca-200"
          }`}
        >
          {incidencia.archivada ? "Archivada · " : ""}{ETIQUETAS_ESTADO[incidencia.estado as Estado] || incidencia.estado}
        </span>
        <p className="mt-3 whitespace-pre-wrap text-gray-700">{incidencia.descripcion}</p>
      </div>

      {puedeCambiarEstadoActual && transicionesPosibles.length > 0 && (
        <div className="rounded-md border border-marca-200 bg-white p-4 shadow-sm">
          <CambiarEstadoIncidencia idIncidencia={incidencia.idIncidencia} transicionesPosibles={transicionesPosibles} />
        </div>
      )}

      <section className="rounded-md border border-marca-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Archivos adjuntos</h3>
        {archivosSeguro.length === 0 ? (
          <p className="text-sm text-gray-500">Sin archivos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {archivosSeguro.some((a) => a.tipoMime?.startsWith("image/")) && (
              <div className="flex flex-wrap gap-3">
                {archivosSeguro
                  .filter((a) => a.tipoMime?.startsWith("image/"))
                  .map((a) => (
                    <a
                      key={a.idArchivo}
                      href={`/api/archivos/${a.idArchivo}/descarga`}
                      target="_blank"
                      rel="noreferrer"
                      title={a.nombreOriginal}
                    >
                      {/* Las imágenes requieren cookie de sesión, por eso se usa <img> directo en vez de next/image */}
                      <img
                        src={`/api/archivos/${a.idArchivo}/descarga`}
                        alt={a.nombreOriginal}
                        className="h-28 w-28 rounded-md border border-marca-200 object-cover transition hover:opacity-80"
                      />
                    </a>
                  ))}
              </div>
            )}
            {archivosSeguro.some((a) => !a.tipoMime?.startsWith("image/")) && (
              <ul className="flex flex-col gap-1">
                {archivosSeguro
                  .filter((a) => !a.tipoMime?.startsWith("image/"))
                  .map((a) => (
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
          </div>
        )}
      </section>

      <section className="rounded-md border border-marca-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Comentarios</h3>
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
        <div className="mt-3">
          <FormularioComentario idIncidencia={incidencia.idIncidencia} />
        </div>
      </section>
    </div>
  );
}

