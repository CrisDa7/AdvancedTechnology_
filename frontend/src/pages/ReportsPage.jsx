// src/pages/ReportsPage.jsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

export default function ReportsPage({ token }) {
  const [granularity, setGranularity] = useState("day");
  const [from, setFrom] = useState(ymd(Date.now() - 30 * 24 * 3600 * 1000));
  const [to, setTo] = useState(ymd(new Date()));
  const [ventas, setVentas] = useState([]);
  const [util, setUtil] = useState([]);
  const [movs, setMovs] = useState([]);
  const [inv, setInv] = useState({ valor_costo: 0, valor_venta: 0 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const q = `granularity=${granularity}&from=${from}&to=${to}`;
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`${API}/api/reportes/ventas?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/reportes/utilidad?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/reportes/movimientos?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/reportes/inventario-valor`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [j1, j2, j3, j4] = await Promise.all([
        r1.json(),
        r2.json(),
        r3.json(),
        r4.json(),
      ]);
      if (!r1.ok) throw new Error(j1.error || "Error ventas");
      if (!r2.ok) throw new Error(j2.error || "Error utilidad");
      if (!r3.ok) throw new Error(j3.error || "Error movimientos");
      if (!r4.ok) throw new Error(j4.error || "Error inventario");

      setVentas(j1.rows || []);
      setUtil(j2.rows || []);
      setMovs(j3.rows || []);
      setInv(j4.resumen || { valor_costo: 0, valor_venta: 0 });
    } catch (e) {
      setErr(e.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sumIngresos = useMemo(
    () => ventas.reduce((a, r) => a + Number(r.ingresos || 0), 0),
    [ventas]
  );
  const sumCOGS = useMemo(
    () => util.reduce((a, r) => a + Number(r.cogs_aprox || 0), 0),
    [util]
  );
  const sumUtil = useMemo(
    () => util.reduce((a, r) => a + Number(r.utilidad || 0), 0),
    [util]
  );

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        <h1 className="mb-4 text-2xl font-bold text-sapphire-900">Reportes</h1>

        {/* Filtros */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Periodo</span>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
            >
              <option value="day">Diario</option>
              <option value="week">Semanal</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Desde</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
            />
          </label>

          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="w-full rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
            >
              {loading ? "Cargando..." : "Aplicar"}
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Resumen */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard title="Ingresos (ventas)" value={`$ ${fmt(sumIngresos)}`} />
          <SummaryCard title="COGS aprox." value={`$ ${fmt(sumCOGS)}`} />
          <SummaryCard title="Utilidad" value={`$ ${fmt(sumUtil)}`} />
          <SummaryCard title="Inventario (costo)" value={`$ ${fmt(inv.valor_costo)}`} />
          <SummaryCard title="Inventario (venta)" value={`$ ${fmt(inv.valor_venta)}`} />
        </div>

        {/* Ventas */}
        <SectionCard title="Ventas por periodo">
          <SimpleTable
            headers={["Periodo", "Ingresos", "Unidades"]}
            rows={ventas.map((r) => [
              new Date(r.periodo).toLocaleDateString(),
              `$ ${fmt(r.ingresos)}`,
              r.unidades,
            ])}
          />
        </SectionCard>

        {/* Utilidad */}
        <SectionCard title="Utilidad por periodo">
          <SimpleTable
            headers={["Periodo", "Ingresos", "COGS aprox.", "Utilidad"]}
            rows={util.map((r) => [
              new Date(r.periodo).toLocaleDateString(),
              `$ ${fmt(r.ingresos)}`,
              `$ ${fmt(r.cogs_aprox)}`,
              `$ ${fmt(r.utilidad)}`,
            ])}
          />
        </SectionCard>

        {/* Movimientos */}
        <SectionCard title="Movimientos de inventario">
          <SimpleTable
            headers={["Periodo", "Entradas", "Salidas", "Anulaciones"]}
            rows={movs.map((r) => [
              new Date(r.periodo).toLocaleDateString(),
              r.entradas,
              r.salidas,
              r.anulaciones,
            ])}
          />
        </SectionCard>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
      <h3 className="mb-3 text-base font-semibold text-sapphire-900">{title}</h3>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm text-slate-900">
        <thead>
          <tr className="bg-slate-100 text-slate-700">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-2">
                Sin datos
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
