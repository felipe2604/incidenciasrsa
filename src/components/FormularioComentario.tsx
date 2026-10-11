"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioComentario({ idIncidencia }: { idIncidencia: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    const resp = await fetch(`/api/incidencias/${idIncidencia}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const json = await resp.json();
    setEnviando(false);
    if (!json.ok) {
      setError(json.message || "No se pudo guardar el comentario.");
      return;
    }
    setTexto("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
      {error && <p className="text-sm text-marca-700">{error}</p>}
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Añadir un comentario…"
        className="rounded-md border p-2"
        required
      />
      <button
        type="submit"
        disabled={enviando}
        className="self-end rounded-md bg-marca-500 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}
