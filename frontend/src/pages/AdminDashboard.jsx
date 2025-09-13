import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminDashboard({ token }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await fetch(`${API}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Error cargando stats");
        setData(body);
      } catch (e) {
        setErr(e.message || "Error");
      }
    })();
  }, [token]);

  if (err)
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {err}
      </div>
    );

  if (!data)
    return (
      <div className="text-slate-600">Cargando...</div>
    );

  const { summary, last_users } = data;

  return (
    <div className="space-y-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total usuarios" value={summary.total} />
        <StatCard title="Administradores" value={summary.admins} />
        <StatCard title="Empleados" value={summary.empleados} />
        <StatCard title="Activos" value={summary.activos} />
        <StatCard title="Inactivos" value={summary.inactivos} />
        <StatCard title="Dados de baja" value={summary.dados_de_baja} />
      </div>

      {/* Últimos registrados */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
        <h3 className="mb-3 text-lg font-semibold text-sapphire-900">Últimos registrados</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <Th>ID</Th>
                <Th>Nombre</Th>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {last_users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td>{u.id}</Td>
                  <Td>{u.nombre_completo}</Td>
                  <Td>{u.usuario}</Td>
                  <Td>
                    <span className="rounded-full bg-sapphire-100 px-2 py-0.5 text-xs font-semibold text-sapphire-800">
                      {u.rol}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.estado === "activo"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {u.estado}
                    </span>
                  </Td>
                  <Td>{new Date(u.fecha_registro).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-3xl font-bold text-sapphire-900">{value}</div>
      <div className="mt-2 h-1 w-full rounded bg-sapphire-100">
        <div className="h-1 w-2/3 rounded bg-sapphire-600" />
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2">{children}</td>;
}
