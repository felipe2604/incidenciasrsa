"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormularioIncidencia, { type ValoresIncidencia } from "./FormularioIncidencia";
import type { OpcionCatalogo } from "@/lib/constants";

interface PropiedadesModalEditarIncidencia {
  idIncidencia: string;
  valoresIniciales: ValoresIncidencia;
  catalogos: { BLOQUES: OpcionCatalogo[]; PLANTAS: OpcionCatalogo[]; ZONAS: OpcionCatalogo[]; CATEGORIAS: OpcionCatalogo[] };
}

export default function ModalEditarIncidencia({ idIncidencia, valoresIniciales, catalogos }: PropiedadesModalEditarIncidencia) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [huboCambios, setHuboCambios] = useState(false);

  function intentarCerrar() {
    if (huboCambios && !window.confirm("Hay cambios sin guardar. ¿Desea cerrar sin guardarlos?")) return;
    setAbierto(false);
    setHuboCambios(false);
  }
  const intentarCerrarRef = useCallback(intentarCerrar, [huboCambios]);

  useEffect(() => {
    if (!abierto) return;
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") intentarCerrarRef();
    }
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto, intentarCerrarRef]);

  function alGuardar() {
    setHuboCambios(false);
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="rounded-md border-2 border-marca-500 bg-white px-4 py-1.5 text-sm font-semibold text-marca-600 shadow-sm hover:bg-marca-500 hover:text-white"
      >
        ✎ Editar
      </button>
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={intentarCerrar}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-editar-incidencia"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 id="titulo-editar-incidencia" className="text-lg font-semibold">Editar incidencia</h2>
              <button
                onClick={intentarCerrar}
                aria-label="Cerrar"
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-marca-100/50"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <FormularioIncidencia
                catalogos={catalogos}
                idIncidencia={idIncidencia}
                valoresIniciales={valoresIniciales}
                onExito={alGuardar}
                onCambio={() => setHuboCambios(true)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
