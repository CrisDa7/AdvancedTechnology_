import { useEffect, useMemo, useRef, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Paleta simple de emojis (sin libs externas)
const EMOJIS = ["😀","😅","😂","😊","😍","😎","😘","😢","😡","🙏","👍","👎","👌","👏","🎉","💯","🔥","⭐","❤️","🥳"];

function useSSE({ enabled, servicioId, token, onMessage }) {
  useEffect(() => {
    if (!enabled || !servicioId || !token) return;
    // SSE con token por query
    const url = `${API}/api/servicios/${servicioId}/comentarios/stream?t=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: false });
    es.onmessage = (e) => {
      try { const data = JSON.parse(e.data); onMessage?.(data); } catch {}
    };
    es.onerror = () => { /* el browser reintenta solo */ };
    return () => es.close();
  }, [enabled, servicioId, token, onMessage]);
}

function formatHour(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ""; }
}

function unreadKey(serviceId) { return `lastSeen-admin-${serviceId}`; }
function isImageMessage(msg) {
  return typeof msg?.mensaje === "string" && msg.mensaje.startsWith("data:image/");
}

export default function ChatWidgetAdmin({ token }) {
  const [open, setOpen] = useState(false);

  // Lista de servicios (bandeja)
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s =>
      (s.nombre_completo || "").toLowerCase().includes(q) ||
      (s.codigo || "").toLowerCase().includes(q) ||
      (s.tipo_equipo || "").toLowerCase().includes(q) ||
      (s.modelo || "").toLowerCase().includes(q)
    );
  }, [query, services]);

  // Conversación activa
  const [active, setActive] = useState(null); // servicio
  const [msgs, setMsgs] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Composer
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageData, setImageData] = useState(null);
  const fileRef = useRef(null);
  const listRef = useRef(null);

  // Cargar bandeja (services)
  useEffect(() => {
    if (!open || !token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/servicios`, { headers: { Authorization: `Bearer ${token}` }});
        const data = await res.json();
        if (res.ok) setServices(data);
      } catch {}
    })();
  }, [open, token]);

  // Traer mensajes de un servicio
  const fetchMsgs = async (id) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`${API}/api/servicios/${id}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMsgs(data);
        // marcar como visto localmente
        localStorage.setItem(unreadKey(id), String(Date.now()));
        // scroll bottom
        setTimeout(() => { listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, 20);
      }
    } finally { setLoadingMsgs(false); }
  };

  // Abrir por evento externo: window.dispatchEvent(new CustomEvent('open-chat',{detail:{serviceId}}))
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      const svc = services.find(s => s.id === e.detail?.serviceId);
      if (svc) {
        setActive(svc);
        fetchMsgs(svc.id);
      }
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, [services, token]);

  // SSE para recibir en tiempo real del servicio activo
  useSSE({
    enabled: open && !!active?.id,
    servicioId: active?.id,
    token,
    onMessage: (c) => {
      setMsgs((arr) => {
        if (arr.some(x => x.id === c.id)) return arr;
        const next = [...arr, c];
        setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 20);
        return next;
      });
    }
  });

  // no-leídos (negrita + punto azul) con lastSeen local
  const hasUnread = (svc) => {
    const seen = Number(localStorage.getItem(unreadKey(svc.id)) || 0);
    const last = svc._last_ts || 0;
    return last > seen;
  };

  // refresca “last msg” y notifica no-leídos en la lista
  useEffect(() => {
    if (!services.length) return;
    // traer solo la “punta” (1 mensaje) de cada servicio para pintar last + detectar no-leídos
    (async () => {
      try {
        await Promise.all(services.map(async (s) => {
          const res = await fetch(`${API}/api/servicios/${s.id}/comentarios`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data) && data.length) {
            const last = data[data.length - 1];
            s._last_preview = isImageMessage(last) ? "[imagen]" : last.mensaje;
            s._last_ts = new Date(last.created_at).getTime();
          }
        }));
        setServices([...services]);
      } catch {}
    })();
  }, [open, token]); // al abrir el widget

  const pickImage = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(f);
  };

  const send = async () => {
    if (!active?.id) return;
    if (!text.trim() && !imageData) return;

    try {
      // si hay imagen, la mando como un mensaje (dataURL). Luego el texto, si existe.
      if (imageData) {
        await fetch(`${API}/api/servicios/${active.id}/comentarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mensaje: imageData })
        });
        setImageData(null);
      }
      if (text.trim()) {
        await fetch(`${API}/api/servicios/${active.id}/comentarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mensaje: text.trim() })
        });
        setText("");
      }
      // el SSE traerá de inmediato lo nuevo
    } catch {
      // si algo falla, podrías mostrar un toast
    }
  };

  const openService = (svc) => {
    setActive(svc);
    setShowEmoji(false);
    setImageData(null);
    setText("");
    fetchMsgs(svc.id);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-sapphire-600 text-white shadow-lg hover:bg-sapphire-700"
        title={open ? "Ocultar mensajes" : "Mensajes"}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[520px] w-[860px] max-w-[95vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Lista (izquierda) */}
          <div className="hidden w-[300px] flex-col border-r border-slate-200 md:flex">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="font-semibold text-slate-900">Mensajes — Admin</div>
            </div>
            <div className="p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente/código…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/30"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.map(svc => {
                const unread = hasUnread(svc);
                return (
                  <button
                    key={svc.id}
                    onClick={() => openService(svc)}
                    className={`mb-2 w-full rounded-lg border px-3 py-2 text-left hover:bg-slate-50 ${
                      active?.id === svc.id ? "border-sapphire-300 bg-sapphire-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-medium ${unread ? "font-bold" : ""}`}>{svc.nombre_completo}</div>
                      <div className="text-xs text-slate-500">{svc.codigo}</div>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                      {svc._last_preview || "—"}
                    </div>
                    {unread && <div className="mt-1 h-2 w-2 rounded-full bg-sapphire-600"/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat (derecha) */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {active ? active.nombre_completo : "Selecciona una conversación"}
                </div>
                {active && (
                  <div className="truncate text-xs text-slate-600">
                    {active.codigo} — {active.tipo_equipo} {active.modelo}
                  </div>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-white">
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 p-3">
              {!active ? (
                <div className="grid h-full place-items-center text-sm text-slate-500">
                  Abre o busca un servicio para chatear.
                </div>
              ) : loadingMsgs ? (
                <div className="p-3 text-sm text-slate-500">Cargando…</div>
              ) : msgs.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">Sin mensajes aún.</div>
              ) : (
                msgs.map(m => {
                  const own = m.autor_tipo !== "cliente";
                  return (
                    <div key={m.id} className={`mb-2 flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl border px-3 py-2 shadow-sm ${
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
            {active && (
              <div className="border-t border-slate-200 bg-white p-2">
                {imageData && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <img src={imageData} className="h-12 rounded" />
                    <button onClick={() => setImageData(null)} className="text-sm text-slate-600 hover:underline">Quitar imagen</button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmoji(v => !v)}
                    className="rounded-md px-2 py-2 text-xl hover:bg-slate-100"
                    title="Emojis"
                  >😊</button>

                  <button
                    onClick={pickImage}
                    className="rounded-md px-2 py-2 hover:bg-slate-100"
                    title="Adjuntar imagen"
                  >📎</button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Escribe un mensaje al cliente…`}
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
        </div>
      )}
    </>
  );
}
