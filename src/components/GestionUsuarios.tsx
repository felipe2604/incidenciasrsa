"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLES } from "@/lib/constants";
import type { Usuario } from "@/lib/types";

interface DatosFormulario {
  email: string;
  nombre: string;
  rol: string;
  ambitoBloques: string;
  ambitoZonas: string;
  activo: boolean;
}

const VACIO: DatosFormulario = { email: "", nombre: "", rol: ROLES.VOCAL, ambitoBloques: "", ambitoZonas: "", activo: true };

export default function GestionUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [editandoEmail, setEditandoEmail] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosFormulario>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  function abrirNuevo() {
    setDatos(VACIO);
    setEditandoEmail(null);
    setErrores({});
    setMensaje("");
    setAbierto(true);
  }

  function abrirEdicion(u: Usuario) {
    setDatos({
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      ambitoBloques: u.ambito_bloques,
      ambitoZonas: u.ambito_zonas,
      activo: u.activo,
    });
    setEditandoEmail(u.email);
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
      const resp = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const json = await resp.json();
      if (!json.ok) {
        setErrores(json.errores || {});
        setMensaje(json.message || "No se pudo guardar el usuario.");
        setEnviando(false);
        return;
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setMensaje("No se pudo guardar el usuario. Compruebe su conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={abrirNuevo}
          className="w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white shadow-sm hover:bg-marca-600 sm:w-auto"
        >
          + Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-marca-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-marca-100 bg-marca-100/20 text-xs text-gray-600">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Ámbito bloques</th>
              <th className="px-3 py-2">Ámbito zonas</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario} className="border-b border-marca-50">
                <td className="whitespace-nowrap px-3 py-2">{u.nombre}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.email}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.rol}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.ambito_bloques || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.ambito_zonas || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.activo ? "Sí" : "No"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => abrirEdicion(u)} className="text-marca-600 underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setAbierto(false)}
        >
          <div className="my-8 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editandoEmail ? "Editar usuario" : "Nuevo usuario"}</h2>
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
                <label className="block text-sm font-medium" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={!!editandoEmail}
                  value={datos.email}
                  onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2 disabled:bg-gray-100"
                />
                {errores.email && <p className="text-sm text-marca-700">{errores.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="nombre">
                  Nombre
                </label>
                <input
                  id="nombre"
                  required
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2"
                />
                {errores.nombre && <p className="text-sm text-marca-700">{errores.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="rol">
                  Rol
                </label>
                <select
                  id="rol"
                  value={datos.rol}
                  onChange={(e) => setDatos({ ...datos, rol: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2"
                >
                  {Object.values(ROLES).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errores.rol && <p className="text-sm text-marca-700">{errores.rol}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium" htmlFor="ambitoBloques">
                    Ámbito bloques
                  </label>
                  <input
                    id="ambitoBloques"
                    placeholder="B1,B2 o *"
                    value={datos.ambitoBloques}
                    onChange={(e) => setDatos({ ...datos, ambitoBloques: e.target.value })}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="ambitoZonas">
                    Ámbito zonas
                  </label>
                  <input
                    id="ambitoZonas"
                    placeholder="PLAZA,PISCINA o *"
                    value={datos.ambitoZonas}
                    onChange={(e) => setDatos({ ...datos, ambitoZonas: e.target.value })}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={datos.activo}
                  onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
                />
                Usuario activo
              </label>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-md bg-marca-500 px-4 py-2 font-semibold text-white hover:bg-marca-600 disabled:opacity-50"
              >
                {enviando ? "Guardando…" : "Guardar usuario"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
