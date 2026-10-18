"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, ClipboardList, LayoutDashboard, Settings, UserRound } from "lucide-react";

export default function NavegacionModerna({ informes, administracion }: { informes: boolean; administracion: boolean }) {
  const pathname = usePathname();
  const enlaces = [
    { href: "/incidencias/panel", texto: "Inicio", Icono: LayoutDashboard },
    { href: "/incidencias", texto: "Incidencias", Icono: ClipboardList },
    ...(informes ? [{ href: "/incidencias/informes", texto: "Informes", Icono: ChartNoAxesCombined }] : []),
    { href: "/incidencias/perfil", texto: "Mi perfil", Icono: UserRound },
    ...(administracion ? [{ href: "/incidencias/administracion", texto: "Administración", Icono: Settings }] : []),
  ];
  return (
    <aside className="navegacion-moderna" aria-label="Menú principal moderno">
      <Link href="/incidencias/panel" className="marca-moderna">
        <Image src="/ico.png" alt="" width={38} height={38} className="rounded-md bg-white p-1" />
        <span><strong className="block text-lg">RSA</strong><span className="text-xs text-white/60">Incidencias</span></span>
      </Link>
      <nav className="enlaces-modernos">
        {enlaces.map(({ href, texto, Icono }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
            <Icono size={18} aria-hidden="true" /><span>{texto}</span>
          </Link>
        ))}
      </nav>
      <div className="pie-menu-moderno"><span className="block text-xs text-white/50">Residencial</span><span className="font-medium">Santa Aurelia</span></div>
    </aside>
  );
}