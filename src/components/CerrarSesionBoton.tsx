"use client";
import { signOut } from "next-auth/react";

export default function CerrarSesionBoton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="shrink-0 whitespace-nowrap rounded-md border border-marca-400 px-3 py-1 text-sm font-medium text-marca-600 transition hover:bg-marca-500 hover:text-white"
    >
      Cerrar sesión
    </button>
  );
}
