"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { comprimirImagen } from "@/lib/compresionImagen";
import { CATALOGOS, PRIORIDADES } from "@/lib/constants";

export default function FormularioIncidencia({ onExito }: { onExito?: (idIncidencia: string) => void }) {
  const router = useRouter();
  const [tipoUbicacion, setTipoUbicacion] = useState<"BLOQUE" | "ZONA_COMUN">("BLOQUE");
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
      const resp = await fetch("/api/incidencias", {
        method: "POST",
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
      if (archivos.length > 0) await subirArchivos(json.data.idIncidencia, archivos);
      if (onExito) {
        onExito(json.data.idIncidencia);
      } else {
        router.push(`/incidencias/${json.data.idIncidencia}`);
      }
      router.refresh();
    } catch {
      setMensaje("No se pudo guardar la incidencia. Compruebe su conexión.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mensaje && <p className="rounded-md bg-marca-100/50 p-3 text-marca-900">{mensaje}</p>}
      <div>
        <label className="block text-sm font-medium" htmlFor="titulo">
          Título
        </label>
        <input id="titulo" name="titulo" required maxLength={120} className="mt-1 w-full rounded-md border p-2" />
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
            <select id="bloque" name="bloque" className="mt-1 w-full rounded-md border p-2">
              {CATALOGOS.BLOQUES.map((b) => (
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
            <select id="planta" name="planta" className="mt-1 w-full rounded-md border p-2">
              {CATALOGOS.PLANTAS.map((p) => (
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
          <select id="zonaComun" name="zonaComun" className="mt-1 w-full rounded-md border p-2">
            {CATALOGOS.ZONAS.map((z) => (
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
        <input id="ubicacionDetalle" name="ubicacionDetalle" maxLength={200} className="mt-1 w-full rounded-md border p-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="categoria">
            Categoría
          </label>
          <select id="categoria" name="categoria" className="mt-1 w-full rounded-md border p-2">
            {CATALOGOS.CATEGORIAS.map((c) => (
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
          <select id="prioridad" name="prioridad" defaultValue="MEDIA" className="mt-1 w-full rounded-md border p-2">
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
          Fotos (opcional)
        </label>
        <input type="file" id="imagenes" name="imagenes" accept=".jpg,.jpeg,.png,.webp" multiple className="mt-1 w-full" />
        <small className="text-gray-500">Puede seleccionar varias. Se reducen de tamaño automáticamente al guardar.</small>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confidencial" /> Marcar como información confidencial
      </label>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-marca-500 px-4 py-2 font-semibold text-white hover:bg-marca-600 disabled:opacity-50"
      >
        {enviando ? "Guardando…" : "Guardar incidencia"}
      </button>
    </form>
  );
}
