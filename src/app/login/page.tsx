"use client";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContenido() {
  const params = useSearchParams();
  const error = params.get("error");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold text-marca-700">Incidencias Residencial Santa Aurelia</h1>
      {error && (
        <p className="max-w-md rounded-md bg-marca-100/40 p-4 text-marca-900">
          Esta cuenta de Google no está autorizada para acceder a la aplicación. Contacte con el administrador si
          cree que es un error.
        </p>
      )}
      <button
        onClick={() => signIn("google", { callbackUrl: "/incidencias/panel" })}
        className="rounded-md bg-marca-500 px-6 py-3 font-semibold text-white hover:bg-marca-600"
      >
        Continuar con Google
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContenido />
    </Suspense>
  );
}
