"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormularioIncidencia, { type ValoresIncidencia } from "./FormularioIncidencia";
import type { OpcionCatalogo } from "@/lib/constants";

interface PropiedadesModalNuevaIncidencia {
  catalogos: { BLOQUES: OpcionCatalogo[]; PLANTAS: OpcionCatalogo[]; ZONAS: OpcionCatalogo[]; CATEGORIAS: OpcionCatalogo[] };
  valoresIniciales?: ValoresIncidencia;
  datosExtra?: Record<string, unknown>;
  etiquetaBoton?: string;
  claseBoton?: string;
}

export default function ModalNuevaIncidencia({ catalogos, valoresIniciales, datosExtra, etiquetaBoton, claseBoton }: PropiedadesModalNuevaIncidencia) {
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
        className={claseBoton || "w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white shadow-sm hover:bg-marca-600 sm:w-auto"}
      >
        {etiquetaBoton || "+ Nueva incidencia"}
      </button>
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-nueva-incidencia"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white p-4 text-left shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 id="titulo-nueva-incidencia" className="text-lg font-semibold">Nueva incidencia</h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-marca-100/50"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <FormularioIncidencia catalogos={catalogos} onExito={alCrear} valoresIniciales={valoresIniciales} datosExtra={datosExtra} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
