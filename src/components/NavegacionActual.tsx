"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefActivo } from "@/lib/navegacion";

export default function NavegacionActual({ enlaces }: { enlaces: { href: string; texto: string }[] }) {
  const activo = hrefActivo(usePathname(), enlaces.map((enlace) => enlace.href));
  return (
    <nav className="app-nav -mx-1 flex gap-1 overflow-x-auto text-sm font-medium text-marca-700 sm:gap-2">
      {enlaces.map(({ href, texto }) => (
        <Link key={href} href={href} aria-current={href === activo ? "page" : undefined}
          className={`whitespace-nowrap rounded-md px-2 py-1 ${href === activo ? "bg-marca-600 text-white" : "hover:bg-marca-100/50"}`}>
          {texto}
        </Link>
      ))}
    </nav>
  );
}
