"use client";

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PALETA = ["#e85d04", "#faa307", "#d00000", "#ffba08", "#dc2f02", "#9d0208", "#f48c06", "#6a040f", "#370617", "#03071e"];

const OPCIONES_DOUGHNUT = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
};

const OPCIONES_BARRA = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

function datosBarra(codigos: string[], valores: Record<string, number>, etiquetas: Record<string, string>) {
  return {
    labels: codigos.map((c) => etiquetas[c] || c),
    datasets: [{ label: "Incidencias abiertas", data: codigos.map((c) => valores[c]), backgroundColor: PALETA }],
  };
}

export default function PanelGraficos({
  porEstado,
  porZona,
  porBloque,
  etiquetasEstado,
  etiquetasZona,
  etiquetasBloque,
}: {
  porEstado: Record<string, number>;
  porZona: Record<string, number>;
  porBloque: Record<string, number>;
  etiquetasEstado: Record<string, string>;
  etiquetasZona: Record<string, string>;
  etiquetasBloque: Record<string, string>;
}) {
  const codigosEstado = Object.keys(porEstado);
  const codigosZona = Object.keys(porZona);
  const codigosBloque = Object.keys(porBloque);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-md border border-marca-200 p-3">
        <h3 className="mb-2 text-sm font-semibold text-marca-700">Por estado</h3>
        <div className="h-56">
          {codigosEstado.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <Doughnut
              data={{
                labels: codigosEstado.map((c) => etiquetasEstado[c] || c),
                datasets: [{ data: codigosEstado.map((c) => porEstado[c]), backgroundColor: PALETA }],
              }}
              options={OPCIONES_DOUGHNUT}
            />
          )}
        </div>
      </div>
      <div className="rounded-md border border-marca-200 p-3">
        <h3 className="mb-2 text-sm font-semibold text-marca-700">Por zona</h3>
        <div className="h-56">
          {codigosZona.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <Bar data={datosBarra(codigosZona, porZona, etiquetasZona)} options={OPCIONES_BARRA} />
          )}
        </div>
      </div>
      <div className="rounded-md border border-marca-200 p-3">
        <h3 className="mb-2 text-sm font-semibold text-marca-700">Abiertas por bloque</h3>
        <div className="h-56">
          {codigosBloque.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <Bar data={datosBarra(codigosBloque, porBloque, etiquetasBloque)} options={OPCIONES_BARRA} />
          )}
        </div>
      </div>
    </div>
  );
}
