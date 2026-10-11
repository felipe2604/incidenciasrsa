"use client";
import { signOut } from "next-auth/react";

export default function CerrarSesionBoton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-marca-600 underline">
      Cerrar sesión
    </button>
  );
}
