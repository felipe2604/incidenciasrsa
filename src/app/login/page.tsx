"use client";
import { Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContenido() {
  const params = useSearchParams();
  const error = params.get("error");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Image src="/logo.png" alt="Residencial Santa Aurelia" width={96} height={96} className="h-20 w-20 rounded-md object-contain sm:h-24 sm:w-24" priority />
      <h1 className="max-w-sm text-xl font-bold text-marca-700 sm:max-w-md sm:text-2xl">
        Incidencias Residencial Santa Aurelia
      </h1>
      {error && (
        <p className="max-w-md rounded-md bg-marca-100/40 p-4 text-marca-900">
          Esta cuenta de Google no está autorizada para acceder a la aplicación. Contacte con el administrador si
          cree que es un error.
        </p>
      )}
      <button
        onClick={() => signIn("google", { callbackUrl: "/incidencias/panel" })}
        className="w-full max-w-xs rounded-md bg-marca-500 px-6 py-3 font-semibold text-white hover:bg-marca-600"
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
