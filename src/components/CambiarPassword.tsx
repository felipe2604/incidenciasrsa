"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function CambiarPassword() {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setMensaje("");
    if (datos.get("nueva") !== datos.get("confirmar")) {
      setMensaje("Las contraseñas nuevas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/perfil", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: datos.get("actual"), nueva: datos.get("nueva") }),
      });
      const resultado = await respuesta.json();
      if (!resultado.ok) { setMensaje(resultado.message || "No se pudo cambiar la contraseña."); return; }
      await signOut({ callbackUrl: "/login?passwordCambiada=1" });
    } catch {
      setMensaje("No se pudo conectar. Inténtelo más tarde.");
    } finally { setEnviando(false); }
  }

  return (
    <form onSubmit={guardar} className="flex w-full max-w-md flex-col gap-4">
      {mensaje && <p role="alert" className="text-sm text-red-700">{mensaje}</p>}
      {[
        { name: "actual", label: "Contraseña actual o temporal", auto: "current-password", min: 1 },
        { name: "nueva", label: "Nueva contraseña", auto: "new-password", min: 12 },
        { name: "confirmar", label: "Confirmar nueva contraseña", auto: "new-password", min: 12 },
      ].map((campo) => (
        <label key={campo.name} className="block text-sm font-medium">
          {campo.label}
          <input name={campo.name} type="password" autoComplete={campo.auto} required minLength={campo.min} maxLength={128}
            className="mt-1 w-full rounded-md border bg-white p-2" />
        </label>
      ))}
      <button disabled={enviando} className="rounded-md bg-marca-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {enviando ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}