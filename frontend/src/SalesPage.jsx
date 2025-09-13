import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function SalesPage({ token }) {
  // Listado de órdenes
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Búsqueda por nombre de cliente (filtrado local)
  const [buscarNombre, setBuscarNombre] = useState("");

  // Modal crear
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detalle (ver items de una orden)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null); // {orden, items}
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Datos del cliente + nota
  const [form, setForm] = useState({
    cliente_nombre: "",
    cedula: "",
    telefono: "",
    descripcion: "",
  });

  // Buscador y líneas (carrito)
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fetchingSug, setFetchingSug] = useState(false);
  const debouncedQ = useDebounce(q, 300);

  const [lineas, setLineas] = useState([]); // {id,codigo,nombre,precio_sugerido,cantidad,precio_unitario?}

  // Validaciones
  const rules = useMemo(
    () => ({
      nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
      cedula: /^\d{10}$/,
      telefono: /^\d{10}$/,
      enteroPos: (v) => /^\d+$/.test(v) && Number(v) >= 1,
      precio: (v) => v === "" || /^(\d+)(\.\d{1,2})?$/.test(v),
    }),
    []
  );

  const validate = () => {
    const e = {};
    if (!rules.nombre.test(form.cliente_nombre))
      e.cliente_nombre = "Nombre: solo letras y espacios";
    if (!rules.cedula.test(form.cedula)) e.cedula = "Cédula: 10 dígitos";
    if (!rules.telefono.test(form.telefono)) e.telefono = "Teléfono: 10 dígitos";
    if (!lineas.length) e.lineas = "Agrega al menos un producto";
    for (const ln of lineas) {
      if (!rules.enteroPos(String(ln.cantidad)))
        return { cantidad: "Cantidad ≥ 1 (entero)" };
      if (!rules.precio(String(ln.precio_unitario ?? "")))
        return { precio_unitario: "Precio inválido (máx 2 decimales)" };
    }
    return e;
  };

  // ====== Cargar órdenes ======
  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/ordenes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener órdenes");
      setOrdenes(data);
    } catch (err) {
      setError(err.message || "Error al cargar órdenes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (token) fetchOrdenes();
  }, [token]);

  // ====== Buscar productos (código o nombre) ======
  useEffect(() => {
    (async () => {
      if (!debouncedQ) {
        setSuggestions([]);
        return;
      }
      try {
        setFetchingSug(true);
        const res = await fetch(
          `${API}/api/productos/search?q=${encodeURIComponent(debouncedQ)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok) setSuggestions(data);
      } finally {
        setFetchingSug(false);
      }
    })();
  }, [debouncedQ, token]);

  const pickProduct = (p) => {
    setLineas((arr) => {
      const i = arr.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const copy = [...arr];
        copy[i] = { ...copy[i], cantidad: copy[i].cantidad + 1 };
        return copy;
      }
      return [
        ...arr,
        {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          precio_sugerido: Number(p.precio_venta) || 0,
          cantidad: 1,
        },
      ];
    });
    setQ("");
    setSuggestions([]);
  };

  const updateLinea = (idx, patch) =>
    setLineas((arr) => arr.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));

  const removeLinea = (idx) => setLineas((arr) => arr.filter((_, i) => i !== idx));

  const totalPreview = lineas.reduce((acc, ln) => {
    const pu =
      ln.precio_unitario === "" || ln.precio_unitario == null
        ? ln.precio_sugerido
        : Number(ln.precio_unitario);
    return acc + pu * Number(ln.cantidad || 0);
  }, 0);

  const onChangeForm = (e) => {
    const { name, value } = e.target;
    if (name === "cedula" || name === "telefono")
      return setForm((f) => ({ ...f, [name]: value.replace(/\D/g, "").slice(0, 10) }));
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ====== Crear orden ======
  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        cliente_nombre: form.cliente_nombre,
        cedula: form.cedula,
        telefono: form.telefono,
        descripcion: form.descripcion || undefined,
        items: lineas.map((ln) => {
          const item = {
            producto_id: Number(ln.id),
            cantidad: Number(ln.cantidad),
          };
          if (ln.precio_unitario !== "" && ln.precio_unitario != null) {
            item.precio_unitario = Number(ln.precio_unitario);
          }
          return item;
        }),
      };

      const res = await fetch(`${API}/api/ordenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear orden");

      // prepend la nueva orden al listado
      setOrdenes((v) => [body.orden, ...v]);

      // limpiar modal
      setLineas([]);
      setForm({ cliente_nombre: "", cedula: "", telefono: "", descripcion: "" });
      setOpen(false);
    } catch (err) {
      setError(err.message || "Error al crear orden");
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Ver detalle ======
  const openDetailFor = async (id) => {
    try {
      setLoadingDetail(true);
      setDetailOpen(true);
      const res = await fetch(`${API}/api/ordenes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener la orden");
      setDetail(data);
    } catch (e) {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ====== Filtrado por nombre (local) ======
  const ordenesFiltradas = useMemo(() => {
    const term = buscarNombre.trim().toLowerCase();
    if (!term) return ordenes;
    return ordenes.filter((o) =>
      String(o.cliente_nombre || "").toLowerCase().includes(term)
    );
  }, [ordenes, buscarNombre]);

  if (!token) {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
          Necesitas iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Título y acciones */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sapphire-900">Ventas</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchOrdenes}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Refrescar
            </button>
            <button
              onClick={() => {
                setError("");
                setOpen(true);
              }}
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 active:translate-y-px"
            >
              Agregar venta
            </button>
          </div>
        </div>

        {/* Búsqueda por nombre de cliente */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">
            Buscar órdenes por cliente
          </h3>
          <div className="grid grid-cols-1 gap-3 md:max-w-xl">
            <Field label="Nombre del cliente">
              <input
                value={buscarNombre}
                onChange={(e) => setBuscarNombre(e.target.value)}
                placeholder="Ej: Ana, Juan Pérez..."
                className={inputCls}
              />
            </Field>
          </div>

          {/* Botón LIMPIAR */}
          <div className="mt-3">
            <button
              onClick={() => setBuscarNombre("")}
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Limpiar
            </button>
          </div>

          {buscarNombre.trim() && (
            <div className="mt-2 text-xs text-slate-600">
              Mostrando resultados para <b>{buscarNombre.trim()}</b>
            </div>
          )}
        </div>

        {/* Listado de órdenes (solo columnas: Cliente, Total, Estado, Acciones) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Órdenes recientes</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando...</p>
          ) : ordenesFiltradas.length === 0 ? (
            <p className="text-slate-600">Sin resultados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Cliente</Th>
                    <Th>Total</Th>
                    <Th>Estado</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td className="font-medium">{o.cliente_nombre}</Td>
                      <Td>${Number(o.total).toFixed(2)}</Td>
                      <Td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            o.estado === "emitida"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {o.estado}
                        </span>
                      </Td>
                      <Td>
                        <button
                          onClick={() => openDetailFor(o.id)}
                          className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          Ver detalle
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: crear orden */}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Agregar venta</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="grid gap-4">
                {/* Datos del cliente */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Nombre del cliente" htmlFor="cliente_nombre">
                    <input
                      id="cliente_nombre"
                      name="cliente_nombre"
                      value={form.cliente_nombre}
                      onChange={onChangeForm}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Cédula (10 dígitos)" htmlFor="cedula">
                    <input
                      id="cedula"
                      name="cedula"
                      value={form.cedula}
                      onChange={onChangeForm}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Teléfono (10 dígitos)" htmlFor="telefono">
                    <input
                      id="telefono"
                      name="telefono"
                      value={form.telefono}
                      onChange={onChangeForm}
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Buscador de productos */}
                <div className="relative">
                  <Field label="Producto (código o nombre)" htmlFor="producto_search">
                    <input
                      id="producto_search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Ej: PR0001, Mouse"
                      className={inputCls}
                    />
                  </Field>

                  {(suggestions.length > 0 || fetchingSug) && (
                    <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {fetchingSug && (
                        <div className="px-3 py-2 text-sm text-slate-600">Buscando...</div>
                      )}
                      {suggestions.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => pickProduct(s)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <div>
                            <b>{s.codigo}</b> — {s.nombre}
                          </div>
                          <small className="text-slate-600">
                            ${Number(s.precio_venta).toFixed(2)}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Líneas seleccionadas */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h4 className="mb-3 text-sm font-semibold text-sapphire-900">
                    Productos seleccionados
                  </h4>
                  {lineas.length === 0 ? (
                    <p className="text-sm text-slate-600">Aún no has agregado productos.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <Th>Producto</Th>
                            <Th className="w-28">Cantidad</Th>
                            <Th className="w-40">Precio unit.</Th>
                            <Th className="w-32">Subtotal</Th>
                            <Th className="w-16"></Th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map((ln, idx) => {
                            const pu =
                              ln.precio_unitario === "" || ln.precio_unitario == null
                                ? ln.precio_sugerido
                                : Number(ln.precio_unitario);
                            const sub = pu * Number(ln.cantidad || 0);
                            return (
                              <tr key={ln.id} className="border-b border-slate-100">
                                <Td>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {ln.codigo} — {ln.nombre}
                                    </span>
                                    <small className="text-slate-500">
                                      Precio sugerido: ${ln.precio_sugerido.toFixed(2)}
                                    </small>
                                  </div>
                                </Td>
                                <Td>
                                  <input
                                    className={inputCls}
                                    value={ln.cantidad}
                                    onChange={(e) =>
                                      updateLinea(idx, {
                                        cantidad: e.target.value.replace(/\D/g, ""),
                                      })
                                    }
                                  />
                                </Td>
                                <Td>
                                  <input
                                    className={inputCls}
                                    placeholder="Auto"
                                    value={ln.precio_unitario ?? ""}
                                    onChange={(e) =>
                                      updateLinea(idx, {
                                        precio_unitario: e.target.value.replace(/[^0-9.]/g, ""),
                                      })
                                    }
                                  />
                                </Td>
                                <Td>${sub.toFixed(2)}</Td>
                                <Td>
                                  <button
                                    type="button"
                                    onClick={() => removeLinea(idx)}
                                    className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                                  >
                                    Quitar
                                  </button>
                                </Td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-3 flex items-center justify-end">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                      <div className="text-xs text-slate-600">Total</div>
                      <div className="text-lg font-bold text-sapphire-900">
                        ${totalPreview.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <Field label="Nota / Descripción" htmlFor="descripcion">
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={onChangeForm}
                    className={`${inputCls} min-h-[80px]`}
                  />
                </Field>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setLineas([]);
                      setError("");
                    }}
                    className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                  >
                    {submitting ? "Guardando..." : "Guardar venta"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: detalle de orden */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Detalle de orden</h3>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setDetail(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              {loadingDetail ? (
                <p className="text-slate-600">Cargando...</p>
              ) : !detail ? (
                <p className="text-slate-600">No se pudo obtener el detalle.</p>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-xs text-slate-600">Cliente</div>
                      <div className="font-semibold text-sapphire-900">
                        {detail.orden.cliente_nombre}
                      </div>
                      <div className="text-xs text-slate-600">
                        CI: {detail.orden.cedula} • Tel: {detail.orden.telefono}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                      <div className="text-xs text-slate-600">Total</div>
                      <div className="text-lg font-bold text-sapphire-900">
                        ${Number(detail.orden.total).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {new Date(detail.orden.fecha_venta).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <h4 className="mb-3 text-sm font-semibold text-sapphire-900">Items</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <Th>Producto</Th>
                            <Th className="w-28">Cantidad</Th>
                            <Th className="w-32">P. unit</Th>
                            <Th className="w-32">Subtotal</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((it) => (
                            <tr key={it.id} className="border-b border-slate-100">
                              <Td>{it.producto_nombre}</Td>
                              <Td>{it.cantidad}</Td>
                              <Td>${Number(it.precio_unitario).toFixed(2)}</Td>
                              <Td>${Number(it.subtotal).toFixed(2)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {detail.orden.descripcion && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <span className="font-semibold">Nota: </span>
                        {detail.orden.descripcion}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Field({ label, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40";
