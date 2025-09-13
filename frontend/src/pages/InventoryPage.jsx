import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InventoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdj, setShowAdj] = useState(false);
  const [showKdx, setShowKdx] = useState(false);
  const [current, setCurrent] = useState(null);
  const [moves, setMoves] = useState([]);

  // Solo usamos cantidad y comentario; el tipo es SIEMPRE 'entrada'
  const [form, setForm] = useState({ cantidad: "", comentario: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/inventario`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar inventario");
      setItems(data);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchAll(); }, [token]);

  const openAdjust = (prod) => {
    setCurrent(prod);
    setForm({ cantidad: "", comentario: "" });
    setError("");
    setShowAdj(true);
  };

  const openKardex = async (prod) => {
    setCurrent(prod);
    setMoves([]);
    setError("");
    setShowKdx(true);
    try {
      const res = await fetch(`${API}/api/inventario/kardex/${prod.id}?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar kardex");
      setMoves(data);
    } catch (e) {
      setMoves([]);
      setError(e.message || "Error al cargar kardex");
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    const cantidad = Number(form.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) return setError("Cantidad inválida");

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/inventario/ajuste`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          producto_id: current.id,
          tipo: "entrada", // ← siempre entrada
          cantidad,
          comentario: form.comentario,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error registrando ajuste");

      // Actualiza stock del listado
      setItems((list) =>
        list.map((p) =>
          p.id === current.id ? { ...p, stock_actual: body.producto.stock_actual } : p
        )
      );
      setShowAdj(false);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((p) =>
    (p.codigo + " " + p.nombre).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Encabezado */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sapphire-900 m-0">Inventario</h1>
          <input
            placeholder="Buscar por código o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
          />
        </div>

        {/* Tarjeta listado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Listado</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Stock</Th>
                    <Th>Inicial</Th>
                    <Th>Precio</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td>{p.codigo}</Td>
                      <Td>{p.nombre}</Td>
                      <Td>
                        <b>{p.stock_actual}</b>
                      </Td>
                      <Td>{p.stock_inicial}</Td>
                      <Td>${Number(p.precio_venta).toFixed(2)}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                            onClick={() => openAdjust(p)}
                          >
                            Entrada
                          </button>
                          <button
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                            onClick={() => openKardex(p)}
                          >
                            Kardex
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <Td colSpan={6}>Sin resultados</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: Ajuste (Entrada) */}
        {showAdj && current && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 m-0">
                  Entrada de stock — {current.codigo} · {current.nombre}
                </h3>
                <button
                  onClick={() => setShowAdj(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitAdjust} className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    <span>Cantidad</span>
                    <input
                      value={form.cantidad}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cantidad: e.target.value.replace(/\D/g, "") }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
                    />
                  </label>
                  <div className="flex flex-col gap-1 text-sm text-slate-700">
                    <span>Tipo</span>
                    <input
                      value="entrada"
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                    />
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Comentario (opcional)</span>
                  <textarea
                    value={form.comentario}
                    onChange={(e) => setForm((f) => ({ ...f, comentario: e.target.value }))}
                    className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40"
                  />
                </label>

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdj(false)}
                    className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Kardex */}
        {showKdx && current && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 m-0">
                  Kardex — {current.codigo} · {current.nombre}
                </h3>
                <button
                  onClick={() => setShowKdx(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <Th>Fecha</Th>
                      <Th>Tipo</Th>
                      <Th>Cant</Th>
                      <Th>Antes</Th>
                      <Th>Después</Th>
                      <Th>Ref</Th>
                      <Th>Comentario</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <Td>{new Date(m.fecha).toLocaleString()}</Td>
                        <Td>{m.tipo}</Td>
                        <Td>{m.cantidad}</Td>
                        <Td>{m.stock_antes}</Td>
                        <Td>{m.stock_despues}</Td>
                        <Td>
                          {m.referencia_tipo}
                          {m.referencia_id ? ` #${m.referencia_id}` : ""}
                        </Td>
                        <Td>{m.comentario || ""}</Td>
                      </tr>
                    ))}
                    {moves.length === 0 && (
                      <tr>
                        <Td colSpan={7}>Sin movimientos</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- helpers UI ---- */
function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, colSpan }) {
  return (
    <td className="px-3 py-2" colSpan={colSpan}>
      {children}
    </td>
  );
}
