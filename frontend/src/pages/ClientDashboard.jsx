import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ClientDashboard({ token, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Detalle + comentarios
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null); // servicio seleccionado (desde items)
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Cargar "mis servicios"
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API}/api/servicios/mios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudo cargar tus servicios");
        setItems(data);
      } catch (e) {
        setError(e.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Abrir detalle y cargar comentarios
  const openDetailFor = async (servicioId) => {
    const svc = items.find((x) => x.id === servicioId) || null;
    setSelected(svc);
    setDetailOpen(true);
    setComments([]);
    if (!svc) return;

    try {
      setLoadingComments(true);
      const res = await fetch(`${API}/api/servicios/${servicioId}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setComments(data);
    } finally {
      setLoadingComments(false);
    }

    // Si implementaste "read receipts", aquí podrías marcar como leído.
    // (Ignora si aún no tienes ese endpoint)
    // for (const c of data.filter(c => c.autor_tipo !== 'cliente' && !c.leido_por_cliente)) {
    //   try { await fetch(`${API}/api/servicios/${servicioId}/comentarios/${c.id}/read`, { method:'PATCH', headers:{ Authorization:`Bearer ${token}` } }); } catch {}
    // }
  };

  // Enviar comentario (como cliente)
  const sendComment = async () => {
    if (!selected || !newMsg.trim()) return;
    try {
      setSending(true);
      const res = await fetch(`${API}/api/servicios/${selected.id}/comentarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mensaje: newMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo enviar");
      // algunos backends devuelven { ok:true, ...comentario }, otros solo el objeto
      const created = data.comentario || data;
      setComments((arr) => [...arr, created]);
      setNewMsg("");
    } catch (e) {
      alert(e.message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
          Inicia sesión para ver tus servicios.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sapphire-900">Mis servicios</h1>
          <button
            onClick={() => {
              // refrescar
              (async () => {
                try {
                  setLoading(true);
                  setError("");
                  const res = await fetch(`${API}/api/servicios/mios`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || "No se pudo cargar");
                  setItems(data);
                } catch (e) {
                  setError(e.message || "Error al cargar");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Refrescar
          </button>
        </div>

        {/* Listado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Servicios recientes</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">No tienes servicios.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Fecha</Th>
                    <Th>Código</Th>
                    <Th>Equipo</Th>
                    <Th>Modelo</Th>
                    <Th>Estado</Th>
                    <Th>Total</Th>
                    <Th>Abono</Th>
                    <Th>Restante</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td>{new Date(s.fecha_recepcion).toLocaleString()}</Td>
                      <Td>{s.codigo}</Td>
                      <Td>{s.tipo_equipo}</Td>
                      <Td>{s.modelo}</Td>
                      <Td>
                        <span className="rounded-full bg-sapphire-100 px-2 py-0.5 text-xs font-semibold text-sapphire-800">
                          {s.estado}
                        </span>
                      </Td>
                      <Td>${Number(s.valor_total).toFixed(2)}</Td>
                      <Td>${Number(s.monto_abono || 0).toFixed(2)}</Td>
                      <Td>${Number(s.valor_restante || 0).toFixed(2)}</Td>
                      <Td>
                        <button
                          onClick={() => openDetailFor(s.id)}
                          className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          Ver detalles / Mensajes
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: detalle + comentarios */}
        {detailOpen && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Servicio {selected.codigo}
                </h3>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setSelected(null);
                    setComments([]);
                    setNewMsg("");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              {/* Resumen del servicio */}
              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs text-slate-600">Cliente</div>
                  <div className="font-semibold text-sapphire-900">
                    {selected.nombre_completo}
                  </div>
                  <div className="text-xs text-slate-600">
                    Recibido: {new Date(selected.fecha_recepcion).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                  <div className="text-xs text-slate-600">Total</div>
                  <div className="text-lg font-bold text-sapphire-900">
                    ${Number(selected.valor_total).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600">
                    Abono: ${Number(selected.monto_abono || 0).toFixed(2)} • Restante: $
                    {Number(selected.valor_restante || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Conversación */}
              <h4 className="mb-2 text-sm font-semibold text-sapphire-900">Mensajes</h4>
              {loadingComments ? (
                <p className="text-slate-600">Cargando mensajes…</p>
              ) : comments.length === 0 ? (
                <p className="text-slate-600">Sin mensajes aún.</p>
              ) : (
                <div className="mb-3 max-h-64 overflow-y-auto space-y-2">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-lg border px-3 py-2 ${
                        c.autor_tipo === "cliente"
                          ? "border-sapphire-200 bg-sapphire-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{c.autor_tipo === "cliente" ? "Tú" : `${c.autor_usuario || "Soporte"}`}</span>
                        <span>{new Date(c.created_at || c.fecha_creado).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-900">{c.mensaje}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enviar mensaje */}
              <div className="grid gap-2">
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Escribe un mensaje para el técnico…"
                  className={`${inputCls} min-h-[80px]`}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={sendComment}
                    disabled={sending || !newMsg.trim()}
                    className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                  >
                    {sending ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers UI ---------- */
function Th({ children }) { return <th className="px-3 py-2">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40";
