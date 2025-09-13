import { useEffect, useRef, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ServiceComments({ token, service, onClose }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const bottomRef = useRef(null);

  const fetchAll = async () => {
    try {
      setErr("");
      const res = await fetch(`${API}/api/servicios/${service.id}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar");
      setItems(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      const res = await fetch(`${API}/api/servicios/${service.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: msg }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al enviar");
      setItems((list) => [...list, body]);
      setMsg("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
    } catch (e) {
      setErr(e.message || "Error al enviar");
    }
  };

  useEffect(() => { fetchAll(); /* opcional: poll */ }, [service.id]);

  return (
    <div style={backdrop}>
      <div style={modal}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{margin:0}}>Comentarios — {service.codigo || `#${service.id}`} · {service.nombre_completo}</h3>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>

        {err && <div style={alert}>{err}</div>}
        {loading ? <p>Cargando...</p> : (
          <>
            <div style={thread}>
              {items.map(c => (
                <div key={c.id} style={{marginBottom:8}}>
                  <div style={{fontSize:12, color:"#64748b"}}>
                    <b>{c.autor_usuario}</b> <small>({c.autor_tipo})</small> · {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div style={{background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 10px", color:"black"}}>
                    {c.mensaje}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} style={{display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8}}>
              <input
                value={msg}
                onChange={e=>setMsg(e.target.value)}
                placeholder="Escribe un comentario…"
                style={input}
              />
              <button type="submit" style={btnBlue}>Enviar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const backdrop = { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, zIndex:9999 };
const modal = { width:"min(800px,100%)", background:"white", borderRadius:12, border:"1px solid #e5e7eb", padding:16, color:"#111827" };
const thread = { maxHeight: "50vh", overflowY: "auto", marginTop: 10, paddingRight: 6 };
const btnBlue = { padding:"10px 14px", borderRadius:10, border:"none", background:"#1d4ed8", color:"white", fontWeight:700, cursor:"pointer" };
const btnGhost = { padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"white", cursor:"pointer" };
const input = { padding:10, borderRadius:8, border:"1px solid #cbd5e1", outline:"none", background:"white" };
const alert = { background:"#fee2e2", color:"#991b1b", border:"1px solid #fecaca", padding:10, borderRadius:8, marginTop:8 };
