// src/pages/ProductsPage.jsx
// Gestión de productos
// - Lista con filtros server-side (codigo/nombre)
// - Modal para crear producto (con validaciones y UX cuidadito)
// - Comentarios en cada sección

import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ProductsPage({ token }) {
  /* ---------------------------- estado principal ---------------------------- */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Para cancelar fetch si navegas rápido
  const abortRef = useRef(null);

  /* ------------------------------ modal crear ------------------------------- */
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    marca: "",
    precio_compra: "",
    precio_venta: "",
    stock_inicial: "",
    descripcion: "",
  });

  /* ----------------------------- filtros server ----------------------------- */
  // Borrador en inputs (lo que escribes) y filtros aplicados (lo que se envía al backend)
  const [draft, setDraft] = useState({ codigo: "", nombre: "" });
  const [filters, setFilters] = useState({ codigo: "", nombre: "" });

  /* ------------------------------ validaciones ------------------------------ */
  const rules = useMemo(
    () => ({
      codigo: /^[A-Za-z0-9_-]+$/,                 // SIN espacios
      categoria: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,    // letras y espacios
      precio: (v) => /^(\d+)(\.\d{1,2})?$/.test(v),
      enteroNoNeg: (v) => /^\d+$/.test(v),
    }),
    []
  );

  const validate = () => {
    const e = {};
    if (!rules.codigo.test(form.codigo)) e.codigo = "Código: solo letras, números, - y _";
    if (!form.nombre.trim()) e.nombre = "Nombre obligatorio";
    if (!rules.categoria.test(form.categoria)) e.categoria = "Categoría: solo letras y espacios";
    if (!rules.precio(form.precio_compra)) e.precio_compra = "Precio compra inválido (máx 2 decimales)";
    if (!rules.precio(form.precio_venta)) e.precio_venta = "Precio venta inválido (máx 2 decimales)";
    if (parseFloat(form.precio_venta) < parseFloat(form.precio_compra)) e.precio_venta = "Venta ≥ Compra";
    if (!rules.enteroNoNeg(form.stock_inicial)) e.stock_inicial = "Stock inicial debe ser entero ≥ 0";
    return e;
  };

  /* --------------------------------- data ---------------------------------- */
  const fetchItems = async (f = filters) => {
    try {
      setLoading(true);
      setError("");

      // Cancela petición previa si aún está en vuelo
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      if (f.codigo?.trim()) params.set("codigo", f.codigo.trim());
      if (f.nombre?.trim()) params.set("nombre", f.nombre.trim());
      const url = `${API}/api/productos${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener productos");
      setItems(data);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchItems({ codigo: "", nombre: "" });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const applyFilters = () => {
    const f = { codigo: draft.codigo.trim(), nombre: draft.nombre.trim() };
    setFilters(f);
    fetchItems(f);
  };

  const clearFilters = () => {
    const f = { codigo: "", nombre: "" };
    setDraft(f);
    setFilters(f);
    fetchItems(f);
  };

  /* --------------------------------- crear --------------------------------- */
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const resetForm = () =>
    setForm({
      codigo: "",
      nombre: "",
      categoria: "",
      marca: "",
      precio_compra: "",
      precio_venta: "",
      stock_inicial: "",
      descripcion: "",
    });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      return;
    }
    try {
      setSubmitting(true);
      setError("");

      // Normaliza payload
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        marca: form.marca.trim() || null,
        precio_compra: parseFloat(form.precio_compra),
        precio_venta: parseFloat(form.precio_venta),
        stock_inicial: parseInt(form.stock_inicial, 10),
        descripcion: form.descripcion.trim() || null,
      };

      const res = await fetch(`${API}/api/productos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear producto");

      await fetchItems(filters); // refresca manteniendo filtros
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err.message || "Error al crear producto");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- accesibilidad --------------------------- */
  // Cierra el modal con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!token) {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
          Necesitas iniciar sesión.
        </p>
      </div>
    );
  }

  /* -------------------------------- render UI ------------------------------ */
  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Título y acciones */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h1 className="m-0 text-2xl font-bold text-sapphire-900">Productos</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {loading ? "—" : `${items.length} resultado${items.length === 1 ? "" : "s"}`}
            </span>
            <button
              onClick={() => fetchItems(filters)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              Refrescar
            </button>
            <button
              onClick={() => {
                setError("");
                resetForm();
                setOpen(true);
              }}
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 active:translate-y-px"
            >
              Agregar producto
            </button>
          </div>
        </div>

        {/* Filtros (server) */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Gestión de productos</h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nombre">
              <input
                value={draft.nombre}
                onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                className={inputCls}
                placeholder="Ej: Mouse"
              />
            </Field>
            <Field label="Código">
              <input
                value={draft.codigo}
                onChange={(e) => setDraft((d) => ({ ...d, codigo: e.target.value }))}
                className={inputCls}
                placeholder="Empieza por…"
              />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-60"
            >
              Aplicar filtros
            </button>
            <button
              onClick={clearFilters}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Listado (solo columnas pedidas) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Listado</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">No hay productos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Venta</Th>
                    <Th>Stock</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td>{p.codigo}</Td>
                      <Td>{p.nombre}</Td>
                      <Td>${Number(p.precio_venta ?? 0).toFixed(2)}</Td>
                      <Td>{p.stock_actual ?? p.stock_inicial}</Td> {/* revisar aquiiii*/}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: crear */}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Agregar producto</h3>
                <button
                  onClick={() => {
                    setOpen(false);
                    setError("");
                  }}
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

              <form onSubmit={submit} className="grid gap-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Código" htmlFor="codigo">
                    <input id="codigo" name="codigo" value={form.codigo} onChange={onChange} className={inputCls} />
                  </Field>
                  <Field label="Nombre" htmlFor="nombre">
                    <input id="nombre" name="nombre" value={form.nombre} onChange={onChange} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Categoría" htmlFor="categoria">
                    <input id="categoria" name="categoria" value={form.categoria} onChange={onChange} className={inputCls} />
                  </Field>
                  <Field label="Marca (opcional)" htmlFor="marca">
                    <input id="marca" name="marca" value={form.marca} onChange={onChange} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Precio compra" htmlFor="precio_compra">
                    <input
                      id="precio_compra"
                      name="precio_compra"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.precio_compra}
                      onChange={onChange}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Precio venta" htmlFor="precio_venta">
                    <input
                      id="precio_venta"
                      name="precio_venta"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.precio_venta}
                      onChange={onChange}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Stock inicial" htmlFor="stock_inicial">
                    <input
                      id="stock_inicial"
                      name="stock_inicial"
                      inputMode="numeric"
                      placeholder="0"
                      value={form.stock_inicial}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stock_inicial: e.target.value.replace(/\D/g, "") }))
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Descripción (opcional)" htmlFor="descripcion">
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={onChange}
                    className={`${inputCls} min-h-[80px]`}
                  />
                </Field>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
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
                    {submitting ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Helpers UI -------------------------------- */

function Field({ label, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2">{children}</td>;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40";
