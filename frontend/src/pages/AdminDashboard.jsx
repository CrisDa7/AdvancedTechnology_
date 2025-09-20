// src/components/AdminDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminDashboard({ token }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(null);

  // Formatters (evita recalcular en cada render)
  const nf = useMemo(() => new Intl.NumberFormat("es-ES"), []);
  const df = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    []
  );

  const fetchStats = async (isRefresh = false) => {
    if (!token) return;
    try {
      setErr("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // cancela petición anterior si la hubiera
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error cargando estadísticas");

      setData(body);
      setLastUpdated(new Date());
    } catch (e) {
      if (e.name !== "AbortError") setErr(e.message || "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
        Necesitas iniciar sesión para ver el panel.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-2xl font-bold text-sapphire-900">Panel administrativo</h2>
          <p className="m-0 text-sm text-slate-500">
            {lastUpdated ? `Última actualización: ${df.format(lastUpdated)}` : "—"}
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing || loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? "Actualizando…" : "Refrescar"}
        </button>
      </div>

      {/* Estados de carga/errores */}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-1 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      {data && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Total usuarios" value={nf.format(data.summary.total)} />
            <StatCard title="Administradores" value={nf.format(data.summary.admins)} />
            <StatCard title="Empleados" value={nf.format(data.summary.empleados)} />
            <StatCard title="Activos" value={nf.format(data.summary.activos)} />
            <StatCard title="Inactivos" value={nf.format(data.summary.inactivos)} />
            <StatCard title="Dados de baja" value={nf.format(data.summary.dados_de_baja)} />
          </div>

          {/* Últimos registrados */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 text-lg font-semibold text-sapphire-900">
                Últimos registrados
              </h3>
            </div>

            {data.last_users?.length ? (
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
                    {data.last_users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <Td>{u.id}</Td>
                        <Td className="font-medium text-slate-900">
                          {u.nombre_completo}
                        </Td>
                        <Td>{u.usuario}</Td>
                        <Td>
                          <Badge tone="sapphire">{u.rol}</Badge>
                        </Td>
                        <Td>
                          {u.estado === "activo" ? (
                            <Badge tone="green">activo</Badge>
                          ) : (
                            <Badge tone="slate">{u.estado}</Badge>
                          )}
                        </Td>
                        <Td>{df.format(new Date(u.fecha_registro))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="Aún no hay usuarios recientes." />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

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

function Badge({ tone = "slate", children }) {
  const map = {
    sapphire: "bg-sapphire-100 text-sapphire-800 border-sapphire-200",
    green: "bg-green-100 text-green-800 border-green-200",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ text = "Sin datos" }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10 text-sm text-slate-600">
      {text}
    </div>
  );
}

function Th({ children }) {
  return (
    <th scope="col" className="px-3 py-2">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
