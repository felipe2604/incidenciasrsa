import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

export default async function IncidenciasLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="mx-auto max-w-4xl p-4">
      <header className="mb-6 flex items-center justify-between border-b border-marca-200 pb-3">
        <Link href="/incidencias" className="text-lg font-bold text-marca-700">
          Incidencias RSA
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span>{session.user?.nombre || session.user?.email}</span>
          <CerrarSesionBoton />
        </div>
      </header>
      {children}
    </div>
  );
}
