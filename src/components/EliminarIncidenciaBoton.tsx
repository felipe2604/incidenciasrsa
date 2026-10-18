"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function EliminarIncidenciaBoton({ idIncidencia, titulo }: { idIncidencia: string; titulo: string }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function eliminar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || confirmacion.trim() !== idIncidencia) return;
    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/incidencias/${encodeURIComponent(idIncidencia)}`, { method: "DELETE" });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.ok) {
        setMensaje(resultado.message || "No se pudo eliminar la incidencia.");
        return;
      }
      dialogo.current?.close();
      router.replace("/incidencias");
      router.refresh();
    } catch {
      setMensaje("No se pudo completar la eliminación. Compruebe la conexión antes de reintentar.");
    } finally { setEnviando(false); }
  }

  return (
    <>
      <button type="button" disabled={enviando} title="Eliminar incidencia y adjuntos"
        className="flex shrink-0 items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        onClick={() => { setConfirmacion(""); setMensaje(""); dialogo.current?.showModal(); }}>
        <Trash2 size={16} aria-hidden="true" />Eliminar
      </button>
      <dialog ref={dialogo} aria-labelledby="titulo-eliminar-incidencia" aria-describedby="aviso-eliminar-incidencia"
        onCancel={(evento) => { if (enviando) evento.preventDefault(); }}
        className="w-96 max-w-[90vw] rounded-md border border-gray-200 bg-white p-5 shadow-xl backdrop:bg-black/50">
        <form onSubmit={eliminar} className="flex min-w-0 flex-col gap-4">
          <h3 id="titulo-eliminar-incidencia" className="text-lg font-semibold">Eliminar incidencia</h3>
          <p className="break-words text-sm font-medium">{titulo} · {idIncidencia}</p>
          <p id="aviso-eliminar-incidencia" className="text-sm text-gray-600">La incidencia, los comentarios y todos sus adjuntos se eliminarán definitivamente. Esta acción no se puede deshacer.</p>
          <label className="text-sm font-medium">Confirmar identificador
            <input autoFocus required autoComplete="off" disabled={enviando} value={confirmacion}
              onChange={(evento) => setConfirmacion(evento.target.value)} placeholder={idIncidencia}
              className="mt-1 w-full rounded-md border p-2 font-mono" />
          </label>
          {mensaje && <p role="alert" className="text-sm text-red-700">{mensaje}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={enviando} onClick={() => dialogo.current?.close()} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={enviando || confirmacion.trim() !== idIncidencia}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
              {enviando ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}