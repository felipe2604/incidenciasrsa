"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFINICION_CATALOGOS, type ClaveCatalogo, type GrupoCatalogo } from "@/lib/constants";
import type { OpcionCatalogoFila } from "@/lib/catalogos";

interface DatosFormulario {
  codigo: string;
  etiqueta: string;
}

const VACIO: DatosFormulario = { codigo: "", etiqueta: "" };

export default function GestionCatalogos({ catalogos }: { catalogos: Record<GrupoCatalogo, OpcionCatalogoFila[]> }) {
  const router = useRouter();
  const [grupoActivo, setGrupoActivo] = useState<GrupoCatalogo>(DEFINICION_CATALOGOS[0].grupo);
  const [abierto, setAbierto] = useState(false);
  const [codigoOriginal, setCodigoOriginal] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosFormulario>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const definicionActiva = DEFINICION_CATALOGOS.find((d) => d.grupo === grupoActivo)!;
  const claveActiva: ClaveCatalogo = definicionActiva.clave;

  function abrirNuevo() {
    setDatos(VACIO);
    setCodigoOriginal(null);
    setErrores({});
    setMensaje("");
    setAbierto(true);
  }

  function abrirEdicion(opcion: OpcionCatalogoFila) {
    setDatos({ codigo: opcion.codigo, etiqueta: opcion.etiqueta });
    setCodigoOriginal(opcion.codigo);
    setErrores({});
    setMensaje("");
    setAbierto(true);
  }

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje("");
    try {
      const resp = await fetch("/api/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: claveActiva, ...datos }),
      });
      const json = await resp.json();
      if (!json.ok) {
        setErrores(json.errores || {});
        setMensaje(json.message || "No se pudo guardar la opción.");
        setEnviando(false);
        return;
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setMensaje("No se pudo guardar la opción. Compruebe su conexión.");
    } finally {
      setEnviando(false);
    }
  }

  async function alternarActivo(opcion: OpcionCatalogoFila) {
    if (opcion.activo) {
      await fetch("/api/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: claveActiva, codigo: opcion.codigo }),
      });
    } else {
      await fetch("/api/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: claveActiva, codigo: opcion.codigo, etiqueta: opcion.etiqueta, activo: true }),
      });
    }
    router.refresh();
  }

  const opciones = catalogos[grupoActivo] || [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {DEFINICION_CATALOGOS.map((d) => (
          <button
            key={d.grupo}
            onClick={() => setGrupoActivo(d.grupo)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              grupoActivo === d.grupo ? "bg-marca-500 text-white" : "border border-marca-200 bg-white text-gray-700 hover:bg-marca-100/30"
            }`}
          >
            {d.etiqueta}
          </button>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={abrirNuevo}
          className="w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white shadow-sm hover:bg-marca-600 sm:w-auto"
        >
          + Nueva opción
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-marca-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-marca-100 bg-marca-100/20 text-xs text-gray-600">
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Etiqueta</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {opciones.map((o) => (
              <tr key={o.codigo} className="border-b border-marca-50">
                <td className="whitespace-nowrap px-3 py-2">{o.codigo}</td>
                <td className="whitespace-nowrap px-3 py-2">{o.etiqueta}</td>
                <td className="whitespace-nowrap px-3 py-2">{o.activo ? "Sí" : "No"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    onClick={() => abrirEdicion(o)}
                    className="mr-2 rounded-md border border-marca-400 px-3 py-1 text-xs font-semibold text-marca-600 hover:bg-marca-500 hover:text-white"
                  >
                    ✎ Editar
                  </button>
                  <button
                    onClick={() => alternarActivo(o)}
                    className={
                      o.activo
                        ? "rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                        : "rounded-md border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white"
                    }
                  >
                    {o.activo ? "✕ Desactivar" : "✓ Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {opciones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  Sin opciones en este catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setAbierto(false)}
        >
          <div className="my-8 w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {codigoOriginal ? `Editar ${definicionActiva.etiqueta.toLowerCase()}` : `Nueva opción en ${definicionActiva.etiqueta.toLowerCase()}`}
              </h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-marca-100/50"
              >
                ×
              </button>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {mensaje && <p className="rounded-md bg-marca-100/50 p-3 text-marca-900">{mensaje}</p>}
              <div>
                <label className="block text-sm font-medium" htmlFor="codigo">
                  Código
                </label>
                <input
                  id="codigo"
                  required
                  disabled={!!codigoOriginal}
                  value={datos.codigo}
                  onChange={(e) => setDatos({ ...datos, codigo: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2 uppercase disabled:bg-gray-100"
                />
                {errores.codigo && <p className="text-sm text-marca-700">{errores.codigo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="etiqueta">
                  Etiqueta
                </label>
                <input
                  id="etiqueta"
                  required
                  value={datos.etiqueta}
                  onChange={(e) => setDatos({ ...datos, etiqueta: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2"
                />
                {errores.etiqueta && <p className="text-sm text-marca-700">{errores.etiqueta}</p>}
              </div>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-md bg-marca-500 px-4 py-2 font-semibold text-white hover:bg-marca-600 disabled:opacity-50"
              >
                {enviando ? "Guardando…" : "Guardar opción"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
