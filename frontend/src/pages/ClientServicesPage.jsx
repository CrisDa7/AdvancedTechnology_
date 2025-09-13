import { useEffect, useState } from "react";
import ServiceComments from "../components/ServiceComments.jsx";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ServicesPage({ token }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [currentService, setCurrentService] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/servicios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar servicios");
      setItems(data);
      setErr("");
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchAll(); }, [token]);

  const filtered = items.filter(s =>
    (s.codigo + " " + s.nombre_completo + " " + s.usuario + " " + s.modelo + " " + s.tipo_equipo)
      .toLowerCase().includes(q.toLowerCase())
  );

  const openComments = (srv) => {
    setCurrentService(srv);
    setShowComments(true);
  };

  return (
    <div style={{ padding: 20, background:"#eef2ff", minHeight:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <h1 style={{ margin:0, color:"#1e3a8a" }}>Servicios</h1>
          <small style={{ color:"#64748b" }}>API: <code>{API}</code></small>
        </div>
        <input
          placeholder="Buscar por código, cliente, equipo o modelo"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          style={{ padding:10, borderRadius:8, border:"1px solid #cbd5e1", width:320 }}
        />
      </div>

      <div style={card}>
        <h3 style={{ marginTop:0, color:"#1e40af" }}>Listado</h3>
        {err && <div style={alert}>{err}</div>}
        {loading ? <p>Cargando…</p> : (
          <div style={{ overflowX:"auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background:"#e5e7eb", color:"black" }}>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Modelo</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id} style={{ color:"black" }}>
                    <td>{s.codigo || `#${s.id}`}</td>
                    <td>{s.nombre_completo}</td>
                    <td>{s.tipo_equipo}</td>
                    <td>{s.modelo}</td>
                    <td>{s.pago_tipo}</td>
                    <td>{s.estado}</td>
                    <td>{new Date(s.fecha_recepcion).toLocaleString()}</td>
                    <td>
                      <button style={btnBlue} onClick={()=>openComments(s)}>Comentarios</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showComments && currentService && (
        <ServiceComments
          token={token}
          service={currentService}
          onClose={()=>setShowComments(false)}
        />
      )}
    </div>
  );
}

const card   = { background:"white", border:"1px solid #dbeafe", borderRadius:12, padding:16, boxShadow:"0 2px 4px rgba(0,0,0,0.05)" };
const table  = { width:"100%", borderCollapse:"collapse" };
const alert  = { background:"#fee2e2", color:"#991b1b", border:"1px solid #fecaca", padding:10, borderRadius:8, marginBottom:8 };
const btnBlue = { padding:"8px 12px", borderRadius:8, border:"none", background:"#1d4ed8", color:"white", cursor:"pointer" };
