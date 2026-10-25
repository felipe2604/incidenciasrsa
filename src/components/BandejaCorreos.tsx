"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ModalNuevaIncidencia from "./ModalNuevaIncidencia";
import type { CorreoEntrante } from "@/lib/mails";
import type { OpcionCatalogo } from "@/lib/constants";

type Catalogos = { BLOQUES: OpcionCatalogo[]; PLANTAS: OpcionCatalogo[]; ZONAS: OpcionCatalogo[]; CATEGORIAS: OpcionCatalogo[] };

export default function BandejaCorreos({ correos, catalogos }: { correos: CorreoEntrante[]; catalogos: Catalogos }) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  async function eliminar(correo: CorreoEntrante) {
    if (!window.confirm(`¿Eliminar el correo «${correo.asunto || "Sin asunto"}»? Se borrará la fila de la hoja Mails.`)) return;
    setEliminando(correo.id);
    setMensaje("");
    try {
      const respuesta = await fetch("/api/correos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: correo.id }) });
      const resultado = await respuesta.json();
      if (!resultado.ok) setMensaje(resultado.message || "No se pudo eliminar el correo.");
      router.refresh();
    } catch { setMensaje("No se pudo conectar. Inténtelo más tarde."); }
    finally { setEliminando(null); }
  }

  if (correos.length === 0) return <p className="text-gray-500">No hay correos pendientes.</p>;
  return (
    <div className="flex flex-col gap-3">
      {mensaje && <p role="alert" className="text-sm text-red-700">{mensaje}</p>}
      {correos.map((correo) => (
        <article key={correo.id} className="min-w-0 rounded-md border border-marca-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-60">
              <h3 className="break-words font-semibold">{correo.asunto || "Sin asunto"}</h3>
              <p className="break-all text-xs text-gray-500">{correo.remitente} · {correo.fecha}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <ModalNuevaIncidencia catalogos={catalogos} datosExtra={{ correoId: correo.id }} etiquetaBoton="Crear incidencia"
                claseBoton="rounded-md bg-marca-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-marca-600"
                valoresIniciales={{
                  titulo: (correo.asunto || "Incidencia recibida por correo").slice(0, 120),
                  descripcion: `Correo recibido el ${correo.fecha} de ${correo.remitente}\n\n${correo.cuerpo}`.slice(0, 4000),
                  tipoUbicacion: "BLOQUE", bloque: "", planta: "", zonaComun: "", ubicacionDetalle: "", categoria: "", prioridad: "MEDIA", confidencial: false,
                }} />
              <button type="button" disabled={eliminando === correo.id} onClick={() => eliminar(correo)}
                className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                <Trash2 size={15} aria-hidden="true" />{eliminando === correo.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
          <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-700">{correo.cuerpo}</p>
        </article>
      ))}
    </div>
  );
}
