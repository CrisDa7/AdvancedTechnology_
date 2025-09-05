import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ClientServicesPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMine = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/servicios/mios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener tus servicios");
      setItems(data);
    } catch (e) {
      setError(e.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchMine(); }, [token]);

  return (
    <div style={{ background: "white", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginTop: 0, color: "#1e40af" }}>Mis servicios</h2>
      {error && <div style={alertBox}>{error}</div>}
      {loading ? (
        <p>Cargando...</p>
      ) : items.length === 0 ? (
        <p>No tienes servicios registrados.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={{ background: "#e5e7eb", color: "black" }}>
                <th>Fecha</th>
                <th>Código</th>
                <th>Equipo</th>
                <th>Modelo</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Abono</th>
                <th>Restante</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id} style={{ color: "black" }}>
                  <td>{new Date(s.fecha_recepcion).toLocaleString()}</td>
                  <td>{s.codigo}</td>
                  <td>{s.tipo_equipo}</td>
                  <td>{s.modelo}</td>
                  <td>{s.estado}</td>
                  <td>{s.pago_tipo}</td>
                  <td>${Number(s.valor_total).toFixed(2)}</td>
                  <td>${Number(s.monto_abono).toFixed(2)}</td>
                  <td>${Number(s.valor_restante).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const alertBox = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
const table = { width: "100%", borderCollapse: "collapse" };
