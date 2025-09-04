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

  if (err) return <div style={alert}>{err}</div>;
  if (!data) return <p>Cargando...</p>;

  const { summary, last_users } = data;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Tarjetas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <Card title="Total usuarios" value={summary.total} />
        <Card title="Administradores" value={summary.admins} />
        <Card title="Empleados" value={summary.empleados} />
        <Card title="Activos" value={summary.activos} />
        <Card title="Inactivos" value={summary.inactivos} />
        <Card title="Dados de baja" value={summary.dados_de_baja} />
      </div>

      {/* Últimos registrados */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Últimos registrados</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e2e8f0" }}>
                <th style={th}>ID</th>
                <th style={th}>Nombre</th>
                <th style={th}>Usuario</th>
                <th style={th}>Rol</th>
                <th style={th}>Estado</th>
                <th style={th}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {last_users.map(u => (
                <tr key={u.id}>
                  <td style={td}>{u.id}</td>
                  <td style={td}>{u.nombre_completo}</td>
                  <td style={td}>{u.usuario}</td>
                  <td style={td}>{u.rol}</td>
                  <td style={td}>{u.estado}</td>
                  <td style={td}>{new Date(u.fecha_registro).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={card}>
      <div style={{ color: "#64748b", fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const alert = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
const th = { textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" };
const td = { padding: 8, borderBottom: "1px solid #f1f5f9" };
