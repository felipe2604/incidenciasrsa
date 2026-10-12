"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!abierto) return;
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto]);

  function alGuardar() {
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="rounded-md border border-marca-400 px-3 py-1 text-sm hover:bg-marca-100"
      >
        Editar
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
              <h2 className="text-lg font-semibold">Editar incidencia</h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-marca-100/50"
              >
                ×
              </button>
            </div>
            <FormularioIncidencia
              catalogos={catalogos}
              idIncidencia={idIncidencia}
              valoresIniciales={valoresIniciales}
              onExito={alGuardar}
            />
          </div>
        </div>
      )}
    </>
  );
}
