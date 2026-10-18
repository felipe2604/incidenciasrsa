"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import SelectorAspecto from "@/components/SelectorAspecto";

function LoginContenido() {
  const params = useSearchParams();
  const error = params.get("error");
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function accederConPassword(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setMensaje("");
    try {
      const resultado = await signIn("credentials", {
        email: String(formulario.get("email") || ""),
        password: String(formulario.get("password") || ""),
        redirect: false,
        callbackUrl: "/incidencias/panel",
      });
      if (!resultado?.ok || resultado.error) {
        setMensaje("No se pudo acceder. Revise sus datos o inténtelo más tarde.");
        return;
      }
      router.replace("/incidencias/panel");
      router.refresh();
    } catch {
      setMensaje("No se pudo conectar. Inténtelo más tarde.");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <SelectorAspecto />
      <Image src="/logo.png" alt="Residencial Santa Aurelia" width={96} height={96} className="h-20 w-20 rounded-md object-contain sm:h-24 sm:w-24" priority />
      <h1 className="max-w-sm text-xl font-bold text-marca-700 sm:max-w-md sm:text-2xl">
        Incidencias Residencial Santa Aurelia
      </h1>
      {params.get("passwordCambiada") && <p role="status" className="text-sm text-green-800">Contraseña actualizada. Inicia sesión de nuevo.</p>}
      {(error || mensaje) && (
        <p role="alert" className="max-w-md rounded-md bg-marca-100/40 p-4 text-marca-900">
          {mensaje || "No se pudo acceder con esta cuenta. Contacte con el administrador si persiste."}
        </p>
      )}
      <button
        onClick={() => signIn("google", { callbackUrl: "/incidencias/panel" })}
        className="w-full max-w-xs rounded-md bg-marca-500 px-6 py-3 font-semibold text-white hover:bg-marca-600"
      >
        Continuar con Google
      </button>
      <form onSubmit={accederConPassword} className="flex w-full max-w-xs flex-col gap-3 border-t border-marca-200 pt-5 text-left">
        <h2 className="text-base font-semibold">Acceso con correo y contraseña</h2>
        <div>
          <label htmlFor="loginEmail" className="block text-sm font-medium">Correo electrónico</label>
          <input id="loginEmail" name="email" type="email" autoComplete="username" required maxLength={200}
            className="mt-1 w-full rounded-md border p-2" />
        </div>
        <div>
          <label htmlFor="loginPassword" className="block text-sm font-medium">Contraseña</label>
          <input id="loginPassword" name="password" type="password" autoComplete="current-password" required maxLength={128}
            className="mt-1 w-full rounded-md border p-2" />
        </div>
        <button type="submit" disabled={enviando}
          className="rounded-md border border-marca-500 px-4 py-2 font-semibold text-marca-700 hover:bg-marca-100/30 disabled:opacity-50">
          {enviando ? "Accediendo..." : "Acceder"}
        </button>
      </form>
      <Link href="/recuperar-contrasena" className="text-sm font-medium text-marca-700 underline">¿Has olvidado tu contraseña?</Link>
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
