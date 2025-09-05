import { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ClientDashboard({ token, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/servicios/mios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudo cargar");
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const stats = useMemo(() => {
    const total = items.length;
    const pagados = items.filter(s => s.estado === "pagado").length;
    const pendientes = total - pagados;
    const ultimo = items[0];
    return { total, pagados, pendientes, ultimo };
  }, [items]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Tarjetas de resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
        <Card title="Servicios totales" value={stats.total} />
        <Card title="Pendientes" value={stats.pendientes} />
        <Card title="Pagados" value={stats.pagados} />
      </div>

      {/* Último servicio (si hay) */}
      {!loading && stats.ultimo && (
        <div style={card}>
          <h3 style={{ marginTop: 0, color: "#1e40af" }}>Último servicio</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 8, color: "black" }}>
            <Field label="Fecha">{new Date(stats.ultimo.fecha_recepcion).toLocaleString()}</Field>
            <Field label="Código">{stats.ultimo.codigo}</Field>
            <Field label="Equipo">{stats.ultimo.tipo_equipo}</Field>
            <Field label="Modelo">{stats.ultimo.modelo}</Field>
            <Field label="Estado">{stats.ultimo.estado}</Field>
            <Field label="Pago">{stats.ultimo.pago_tipo}</Field>
            <Field label="Total">${Number(stats.ultimo.valor_total).toFixed(2)}</Field>
            <Field label="Abono">${Number(stats.ultimo.monto_abono).toFixed(2)}</Field>
            <Field label="Restante">${Number(stats.ultimo.valor_restante).toFixed(2)}</Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={card}>
      <div style={{ color: "#475569", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "black" }}>{value}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "black", fontWeight: 600 }}>{children}</div>
    </div>
  );
}

const card = {
  background: "white",
  border: "1px solid #dbeafe",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};
