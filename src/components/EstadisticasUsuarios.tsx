import type { ContadorUsuario } from "@/lib/estadisticasUsuarios";

export default function EstadisticasUsuarios({ usuarios, sinIdentificar }: { usuarios: ContadorUsuario[]; sinIdentificar: number }) {
  return (
    <section className="min-w-0 space-y-4">
      <h2 className="text-xl font-semibold">Incidencias por usuario</h2>
      {sinIdentificar > 0 && <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {sinIdentificar} incidencia{sinIdentificar === 1 ? " histórica tiene" : "s históricas tienen"} autores o responsables sin identificar de forma única. Sus contadores no se atribuyen a ninguna cuenta hasta revisar esos registros.
      </p>}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>
            <th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Perfil</th>
            <th className="px-4 py-3 text-right">Creadas</th><th className="px-4 py-3 text-right">Asignadas</th><th className="px-4 py-3 text-right">Asignadas abiertas</th>
          </tr></thead>
          <tbody>{usuarios.map((usuario) => <tr key={usuario.email} className="border-b border-gray-100 last:border-0">
            <th scope="row" className="px-4 py-3 font-medium"><span className="block">{usuario.nombre}{!usuario.activo ? " · Inactivo" : ""}</span><span className="block text-xs font-normal text-gray-500">{usuario.email}</span></th>
            <td className="px-4 py-3 text-xs">{usuario.rol.replaceAll("_", " ")}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{usuario.creadas}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{usuario.asignadas}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums text-marca-700">{usuario.abiertas}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}