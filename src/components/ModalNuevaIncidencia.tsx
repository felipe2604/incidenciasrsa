"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormularioIncidencia from "./FormularioIncidencia";

export default function ModalNuevaIncidencia() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto]);

  function alCrear(idIncidencia: string) {
    setAbierto(false);
    router.push(`/incidencias/${idIncidencia}`);
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white shadow-sm hover:bg-marca-600 sm:w-auto"
      >
        + Nueva incidencia
      </button>
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setAbierto(false)}
        >
          <div
            className="my-8 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva incidencia</h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-marca-100/50"
              >
                ×
              </button>
            </div>
            <FormularioIncidencia onExito={alCrear} />
          </div>
        </div>
      )}
    </>
  );
}
