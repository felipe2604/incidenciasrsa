"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Clock3, RefreshCw, UserRoundCheck, X } from "lucide-react";
import type { NotificacionIncidencia } from "@/lib/notificaciones";

function posicionPanel(boton: HTMLButtonElement | null) {
  const rectangulo = boton?.getBoundingClientRect();
  const width = Math.min(384, window.innerWidth - 24);
  return { width, left: Math.max(12, Math.min((rectangulo?.right || window.innerWidth) - width, window.innerWidth - width - 12)),
    top: Math.max(12, Math.min((rectangulo?.bottom || 60) + 8, window.innerHeight - 240)) };
}

export default function CampanaNotificaciones({ correo }: { correo: string }) {
  const { data: sesion } = useSession();
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const avisoMostrado = useRef(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionIncidencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState(0);
  const [posicion, setPosicion] = useState({ width: 320, left: 12, top: 80 });
  const pendientes = notificaciones.filter((notificacion) => !notificacion.leida);

  useEffect(() => {
    const controlador = new AbortController();
    let enCurso = false;
    async function actualizar() {
      if (enCurso) return;
      enCurso = true;
      try {
        const respuesta = await fetch("/api/notificaciones", { signal: controlador.signal, cache: "no-store" });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.ok) throw new Error("No se pudieron cargar las notificaciones.");
        setNotificaciones(resultado.data);
        setError("");
        setCargado(true);
      } catch { if (!controlador.signal.aborted) setError("No se pudieron cargar las notificaciones."); }
      finally { enCurso = false; }
    }
    void actualizar();
    const intervalo = window.setInterval(actualizar, 120000);
    window.addEventListener("focus", actualizar);
    return () => { controlador.abort(); window.clearInterval(intervalo); window.removeEventListener("focus", actualizar); };
  }, [correo, revision]);

  useEffect(() => {
    if (!cargado || !sesion?.user?.expiraAcceso || avisoMostrado.current) return;
    avisoMostrado.current = true;
    const clave = `rsa-aviso:${correo}:${sesion.user.expiraAcceso}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* El aviso funciona también sin almacenamiento. */ }
    const nuevas = notificaciones.filter((notificacion) => !notificacion.leida);
    const asignaciones = nuevas.filter((notificacion) => notificacion.tipo === "ASIGNACION").length;
    const plazos = nuevas.length - asignaciones;
    if (nuevas.length) setAviso(`Tienes ${asignaciones} ${asignaciones === 1 ? "asignación" : "asignaciones"} y ${plazos} ${plazos === 1 ? "aviso" : "avisos"} de plazo pendientes.`);
  }, [cargado, sesion?.user?.expiraAcceso, correo, notificaciones]);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), 10000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    if (!abierto) return;
    function cerrarFuera(evento: PointerEvent) { if (!raiz.current?.contains(evento.target as Node)) setAbierto(false); }
    function teclado(evento: KeyboardEvent) { if (evento.key === "Escape") { setAbierto(false); boton.current?.focus(); } }
    function redimensionar() { setPosicion(posicionPanel(boton.current)); }
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", teclado);
    window.addEventListener("resize", redimensionar);
    return () => { document.removeEventListener("pointerdown", cerrarFuera); document.removeEventListener("keydown", teclado); window.removeEventListener("resize", redimensionar); };
  }, [abierto]);

  async function marcar(ids: string[]) {
    if (!ids.length || guardando) return;
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.ok) throw new Error();
      setNotificaciones((actuales) => actuales.map((notificacion) => resultado.data.includes(notificacion.id) ? { ...notificacion, leida: true } : notificacion));
      setAviso(null);
      setError("");
    } catch { setError("No se pudo guardar la lectura. Actualiza las notificaciones y vuelve a intentarlo."); }
    finally { setGuardando(false); }
  }

  function alternar() { setPosicion(posicionPanel(boton.current)); setAbierto(!abierto); setAviso(null); }
  return (
    <div ref={raiz} className="relative shrink-0">
      <button ref={boton} type="button" onClick={alternar} title="Notificaciones de incidencias" aria-label={`Notificaciones${pendientes.length ? `, ${pendientes.length} sin leer` : ""}`} aria-expanded={abierto} aria-controls="notificaciones-rsa"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
        <Bell size={19} aria-hidden="true" />
        {pendientes.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{pendientes.length > 99 ? "99+" : pendientes.length}</span>}
      </button>
      {aviso && <div role="status" className="fixed right-3 top-3 z-50 flex w-96 max-w-[calc(100vw-1.5rem)] items-start gap-3 rounded-md border border-blue-200 bg-white p-4 text-sm shadow-lg">
        <Bell size={19} className="shrink-0 text-blue-700" aria-hidden="true" /><div className="min-w-0 flex-1"><p>{aviso}</p><button onClick={alternar} className="mt-2 font-semibold text-blue-700">Ver notificaciones</button></div>
        <button onClick={() => setAviso(null)} title="Cerrar aviso" aria-label="Cerrar aviso"><X size={16} /></button>
      </div>}
      {abierto && <section id="notificaciones-rsa" role="dialog" aria-label="Notificaciones de incidencias" style={posicion} className="fixed z-50 overflow-hidden rounded-md border border-gray-200 bg-white text-gray-800 shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b p-4"><h2 className="text-base font-semibold">Notificaciones</h2><button onClick={() => setAbierto(false)} title="Cerrar notificaciones" aria-label="Cerrar notificaciones"><X size={18} /></button></div>
        <div className="flex items-center justify-between border-b px-4 py-2 text-xs">
          <button disabled={!pendientes.length || guardando} onClick={() => marcar(pendientes.slice(0, 100).map((notificacion) => notificacion.id))} className="flex items-center gap-1 font-medium text-marca-700 disabled:opacity-40"><CheckCheck size={15} />Marcar leídas</button>
          <button onClick={() => setRevision((actual) => actual + 1)} className="flex items-center gap-1 text-gray-600"><RefreshCw size={13} />Actualizar</button>
        </div>
        {error && <p role="alert" className="p-3 text-xs text-red-700">{error}</p>}
        <ul className="max-h-[55vh] divide-y overflow-y-auto">
          {notificaciones.map((notificacion) => <li key={notificacion.id} className={notificacion.leida ? "bg-white" : "bg-blue-50/60"}>
            <Link href={notificacion.href} onClick={() => { if (!notificacion.leida) void marcar([notificacion.id]); setAbierto(false); }} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
              {notificacion.tipo === "ASIGNACION" ? <UserRoundCheck size={19} className="mt-0.5 shrink-0 text-blue-700" /> : <Clock3 size={19} className={`mt-0.5 shrink-0 ${notificacion.tipo === "VENCIDA" ? "text-red-700" : "text-amber-600"}`} />}
              <div className="min-w-0"><p className="break-words text-sm font-semibold">{notificacion.titulo}</p><p className="mt-1 text-xs text-gray-600">{notificacion.detalle}</p></div>
              {!notificacion.leida && <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Sin leer" />}
            </Link>
          </li>)}
        </ul>
        {cargado && notificaciones.length === 0 && <p className="p-5 text-sm text-gray-500">No tienes notificaciones.</p>}
        {!cargado && !error && <p className="p-5 text-sm text-gray-500">Cargando...</p>}
      </section>}
    </div>
  );
}