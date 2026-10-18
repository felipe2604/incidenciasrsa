import Link from "next/link";

export default function RecuperarContrasenaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 p-6">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p>Contacta con el administrador para obtener una contraseña temporal. El envío automático por correo no está habilitado.</p>
      <Link href="/login" className="font-medium text-marca-700 underline">Volver al inicio de sesión</Link>
    </main>
  );
}