import { useEffect, useRef, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const EMOJIS = ["😀","😅","😂","😊","😍","😎","😘","😢","😡","🙏","👍","👎","👌","👏","🎉","💯","🔥","⭐","❤️","🥳"];
function formatHour(ts){ try { return new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}catch{return "";} }
function isImageMessage(m){ return typeof m?.mensaje === "string" && m.mensaje.startsWith("data:image/"); }

export default function ChatWidgetClient({ token }) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState(null); // el cliente suele tener 1 servicio actual (o varios)
  const [services, setServices] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageData, setImageData] = useState(null);
  const fileRef = useRef(null);
  const listRef = useRef(null);

  // Cargar mis servicios (para elegir)
  useEffect(() => {
    if (!open || !token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/servicios/mios`, { headers: { Authorization: `Bearer ${token}` }});
        const data = await res.json();
        if (res.ok) {
          setServices(data);
          if (!service && data.length) {
            setService(data[0]);
          }
        }
      } catch {}
    })();
  }, [open, token]);

  // cargar mensajes del servicio
  const fetchMsgs = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/servicios/${id}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMsgs(data);
        setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior:"smooth" }), 20);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open && service?.id) fetchMsgs(service.id); }, [open, service?.id]);

  // SSE
  useEffect(() => {
    if (!open || !service?.id || !token) return;
    const url = `${API}/api/servicios/${service.id}/comentarios/stream?t=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMsgs(arr => {
          if (arr.some(x => x.id === data.id)) return arr;
          const next = [...arr, data];
          setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior:"smooth" }), 20);
          return next;
        });
      } catch {}
    };
    return () => es.close();
  }, [open, service?.id, token]);

  const pickImage = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(f);
  };

  const send = async () => {
    if (!service?.id) return;
    if (!text.trim() && !imageData) return;

    try {
      if (imageData) {
        await fetch(`${API}/api/servicios/${service.id}/comentarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mensaje: imageData })
        });
        setImageData(null);
      }
      if (text.trim()) {
        await fetch(`${API}/api/servicios/${service.id}/comentarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mensaje: text.trim() })
        });
        setText("");
      }
    } catch {}
  };

  // Abrir chat directo a un servicio desde la tabla (opcional)
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      const sid = e.detail?.serviceId;
      if (!sid) return;
      const found = services.find(s => s.id === sid);
      if (found) setService(found);
      fetchMsgs(sid);
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, [services]);

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-sapphire-600 text-white shadow-lg hover:bg-sapphire-700"
        title={open ? "Ocultar ayuda" : "Ayuda — Advanced Technology"}
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[520px] w-[420px] max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">Ayuda — Advanced Technology</div>
              {service && (
                <div className="truncate text-xs text-slate-600">
                  {service.codigo} · {service.tipo_equipo} {service.modelo}
                </div>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-white">✕</button>
          </div>

          {/* Selector de servicio (si tiene varios) */}
          {services.length > 1 && (
            <div className="border-b border-slate-200 p-2">
              <select
                value={service?.id || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const s = services.find(x => x.id === id);
                  setService(s || null);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/30"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} — {s.tipo_equipo} {s.modelo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mensajes */}
          <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 p-3">
            {!service ? (
              <div className="grid h-full place-items-center text-sm text-slate-500">No tienes servicios activos.</div>
            ) : loading ? (
              <div className="p-3 text-sm text-slate-500">Cargando…</div>
            ) : msgs.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">Sin mensajes aún.</div>
            ) : (
              msgs.map(m => {
                const own = m.autor_tipo === "cliente";
                return (
                  <div key={m.id} className={`mb-2 flex ${own ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl border px-3 py-2 shadow-sm ${
                      own ? "border-sapphire-300 bg-sapphire-600 text-white" : "border-slate-200 bg-white text-slate-900"
                    }`}>
                      {isImageMessage(m) ? (
                        <img src={m.mensaje} alt="imagen" className="max-h-64 rounded-xl" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-[0.95rem]">{m.mensaje}</div>
                      )}
                      <div className={`mt-1 text-xs ${own ? "text-white/80" : "text-slate-500"}`}>
                        {formatHour(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          {service && (
            <div className="border-t border-slate-200 bg-white p-2">
              {imageData && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <img src={imageData} className="h-12 rounded" />
                  <button onClick={() => setImageData(null)} className="text-sm text-slate-600 hover:underline">Quitar imagen</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEmoji(v => !v)} className="rounded-md px-2 py-2 text-xl hover:bg-slate-100" title="Emojis">😊</button>
                <button onClick={() => fileRef.current?.click()} className="rounded-md px-2 py-2 hover:bg-slate-100" title="Adjuntar imagen">📎</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escribe tu mensaje…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/30"
                />
                <button
                  onClick={send}
                  className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-60"
                  disabled={!text.trim() && !imageData}
                >
                  Enviar
                </button>
              </div>
              {showEmoji && (
                <div className="mt-2 grid max-h-32 grid-cols-10 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setText(t => t + e)} className="grid place-items-center rounded-md px-2 py-1 text-xl hover:bg-slate-50">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
