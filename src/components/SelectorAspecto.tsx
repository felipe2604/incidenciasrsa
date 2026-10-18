"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, PanelsTopLeft } from "lucide-react";

export default function SelectorAspecto() {
  const [aspecto, setAspecto] = useState("actual");
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("rsa-aspecto") === "moderno" ? "moderno" : "actual";
      setAspecto(guardado);
      document.documentElement.dataset.aspecto = guardado;
    } catch { document.documentElement.dataset.aspecto = "actual"; }
  }, []);

  function seleccionar(valor: string) {
    setAspecto(valor);
    document.documentElement.dataset.aspecto = valor;
    try { localStorage.setItem("rsa-aspecto", valor); } catch { /* El aspecto sigue funcionando sin almacenamiento local. */ }
  }

  return (
    <div role="group" aria-label="Aspecto de la aplicación" className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white p-1 text-xs">
      {[
        { valor: "actual", etiqueta: "Actual", Icono: PanelsTopLeft },
        { valor: "moderno", etiqueta: "Moderno", Icono: LayoutDashboard },
      ].map(({ valor, etiqueta, Icono }) => (
        <button key={valor} type="button" title={`Aspecto ${etiqueta.toLowerCase()}`} aria-pressed={aspecto === valor}
          onClick={() => seleccionar(valor)} className={`flex items-center gap-1.5 rounded px-2 py-1.5 font-medium transition ${aspecto === valor ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          <Icono size={15} aria-hidden="true" />{etiqueta}
        </button>
      ))}
    </div>
  );
}