"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CambiarEstadoIncidencia({
  idIncidencia,
  transicionesPosibles,
}: {
  idIncidencia: string;
  transicionesPosibles: string[];
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function cambiar(nuevoEstado: string) {
    setEnviando(true);
    setError("");
    const resp = await fetch(`/api/incidencias/${idIncidencia}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    const json = await resp.json();
    setEnviando(false);
    if (!json.ok) {
      setError(json.message || "No se pudo cambiar el estado.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">Cambiar estado:</span>
      {transicionesPosibles.map((estado) => (
        <button
          key={estado}
          disabled={enviando}
          onClick={() => cambiar(estado)}
          className="rounded-md border border-marca-400 px-3 py-1 text-sm hover:bg-marca-100 disabled:opacity-50"
        >
          {estado}
        </button>
      ))}
      {error && <span className="text-sm text-marca-700">{error}</span>}
    </div>
  );
}
