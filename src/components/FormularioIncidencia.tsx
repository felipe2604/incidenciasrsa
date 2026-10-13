"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { comprimirImagen } from "@/lib/compresionImagen";
import { PRIORIDADES, type OpcionCatalogo } from "@/lib/constants";

export interface ValoresIncidencia {
  titulo: string;
  descripcion: string;
  tipoUbicacion: "BLOQUE" | "ZONA_COMUN";
  bloque: string;
  planta: string;
  zonaComun: string;
  ubicacionDetalle: string;
  categoria: string;
  prioridad: string;
  confidencial: boolean;
}

interface CatalogosFormulario {
  BLOQUES: OpcionCatalogo[];
  PLANTAS: OpcionCatalogo[];
  ZONAS: OpcionCatalogo[];
  CATEGORIAS: OpcionCatalogo[];
}

interface PropiedadesFormularioIncidencia {
  catalogos: CatalogosFormulario;
  onExito?: (idIncidencia: string) => void;
  onCambio?: () => void;
  idIncidencia?: string;
  valoresIniciales?: ValoresIncidencia;
}

export default function FormularioIncidencia({ catalogos, onExito, onCambio, idIncidencia, valoresIniciales }: PropiedadesFormularioIncidencia) {
  const modoEdicion = !!idIncidencia;
  const router = useRouter();
  const [tipoUbicacion, setTipoUbicacion] = useState<"BLOQUE" | "ZONA_COMUN">(valoresIniciales?.tipoUbicacion || "BLOQUE");
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");

  async function subirArchivos(idIncidencia: string, archivos: File[]) {
    for (const archivo of archivos) {
      try {
        const comprimido = await comprimirImagen(archivo);
        await fetch("/api/archivos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idIncidencia,
            nombreOriginal: comprimido.nombre,
            tipoMime: comprimido.tipoMime,
            contenidoBase64: comprimido.base64,
          }),
        });
      } catch {
        // Se continúa con el resto de archivos aunque uno falle.
      }
    }
  }

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje("");
    const formulario = evento.currentTarget;
    const form = new FormData(formulario);
    const campoImagenes = formulario.elements.namedItem("imagenes") as HTMLInputElement | null;
    const archivos = campoImagenes?.files ? Array.from(campoImagenes.files) : [];
    const datos = {
      titulo: form.get("titulo"),
      descripcion: form.get("descripcion"),
      tipoUbicacion,
      bloque: form.get("bloque"),
      planta: form.get("planta"),
      zonaComun: form.get("zonaComun"),
      ubicacionDetalle: form.get("ubicacionDetalle"),
      categoria: form.get("categoria"),
      prioridad: form.get("prioridad"),
      confidencial: form.get("confidencial") === "on",
    };
    try {
      const resp = await fetch(modoEdicion ? `/api/incidencias/${idIncidencia}` : "/api/incidencias", {
        method: modoEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const json = await resp.json();
      if (!json.ok) {
        setErrores(json.errores || {});
        setMensaje(json.message || "No se pudo guardar la incidencia.");
        setEnviando(false);
        return;
      }
      const idResultante = modoEdicion ? idIncidencia! : json.data.idIncidencia;
      if (archivos.length > 0) await subirArchivos(idResultante, archivos);
      if (onExito) {
        onExito(idResultante);
      } else {
        router.push(`/incidencias/${idResultante}`);
      }
      router.refresh();
    } catch {
      setMensaje("No se pudo guardar la incidencia. Compruebe su conexión.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} onChange={onCambio} className="flex flex-col gap-4">
      {mensaje && <p className="rounded-md bg-marca-100/50 p-3 text-marca-900">{mensaje}</p>}
      <div>
        <label className="block text-sm font-medium" htmlFor="titulo">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          maxLength={120}
          defaultValue={valoresIniciales?.titulo}
          className="mt-1 w-full rounded-md border p-2"
        />
        {errores.titulo && <p className="text-sm text-marca-700">{errores.titulo}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="descripcion">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          maxLength={4000}
          rows={4}
          defaultValue={valoresIniciales?.descripcion}
          className="mt-1 w-full rounded-md border p-2"
        />
        {errores.descripcion && <p className="text-sm text-marca-700">{errores.descripcion}</p>}
      </div>
      <div>
        <span className="block text-sm font-medium">Ubicación</span>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="tipoUbicacionRadio"
              checked={tipoUbicacion === "BLOQUE"}
              onChange={() => setTipoUbicacion("BLOQUE")}
            />{" "}
            Bloque
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="tipoUbicacionRadio"
              checked={tipoUbicacion === "ZONA_COMUN"}
              onChange={() => setTipoUbicacion("ZONA_COMUN")}
            />{" "}
            Zona común
          </label>
        </div>
        {errores.tipoUbicacion && <p className="text-sm text-marca-700">{errores.tipoUbicacion}</p>}
      </div>
      {tipoUbicacion === "BLOQUE" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="bloque">
              Bloque
            </label>
            <select id="bloque" name="bloque" defaultValue={valoresIniciales?.bloque} className="mt-1 w-full rounded-md border p-2">
              {catalogos.BLOQUES.map((b) => (
                <option key={b.codigo} value={b.codigo}>
                  {b.etiqueta}
                </option>
              ))}
            </select>
            {errores.bloque && <p className="text-sm text-marca-700">{errores.bloque}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="planta">
              Planta
            </label>
            <select id="planta" name="planta" defaultValue={valoresIniciales?.planta} className="mt-1 w-full rounded-md border p-2">
              {catalogos.PLANTAS.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium" htmlFor="zonaComun">
            Zona común
          </label>
          <select id="zonaComun" name="zonaComun" defaultValue={valoresIniciales?.zonaComun} className="mt-1 w-full rounded-md border p-2">
            {catalogos.ZONAS.map((z) => (
              <option key={z.codigo} value={z.codigo}>
                {z.etiqueta}
              </option>
            ))}
          </select>
          {errores.zonaComun && <p className="text-sm text-marca-700">{errores.zonaComun}</p>}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium" htmlFor="ubicacionDetalle">
          Detalle de ubicación (opcional)
        </label>
        <input
          id="ubicacionDetalle"
          name="ubicacionDetalle"
          maxLength={200}
          defaultValue={valoresIniciales?.ubicacionDetalle}
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="categoria">
            Categoría
          </label>
          <select id="categoria" name="categoria" defaultValue={valoresIniciales?.categoria} className="mt-1 w-full rounded-md border p-2">
            {catalogos.CATEGORIAS.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.etiqueta}
              </option>
            ))}
          </select>
          {errores.categoria && <p className="text-sm text-marca-700">{errores.categoria}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="prioridad">
            Prioridad
          </label>
          <select id="prioridad" name="prioridad" defaultValue={valoresIniciales?.prioridad || "MEDIA"} className="mt-1 w-full rounded-md border p-2">
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errores.prioridad && <p className="text-sm text-marca-700">{errores.prioridad}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="imagenes">
          {modoEdicion ? "Añadir fotos o archivos (opcional)" : "Fotos (opcional)"}
        </label>
        <input type="file" id="imagenes" name="imagenes" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple className="mt-1 w-full" />
        <small className="text-gray-500">Puede seleccionar varios. Las fotos se reducen de tamaño automáticamente al guardar.</small>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confidencial" defaultChecked={valoresIniciales?.confidencial} /> Marcar como información
        confidencial
      </label>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-marca-500 px-4 py-2 font-semibold text-white hover:bg-marca-600 disabled:opacity-50"
      >
        {enviando ? "Guardando…" : modoEdicion ? "Guardar cambios" : "Guardar incidencia"}
      </button>
    </form>
  );
}
