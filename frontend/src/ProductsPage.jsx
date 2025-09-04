import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ProductsPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const rules = useMemo(() => ({
    codigo: /^[A-Za-z0-9_-]+$/,
    categoria: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
    precio: (v) => /^(\d+)(\.\d{1,2})?$/.test(v), // 2 decimales máx
    enteroNoNeg: (v) => /^\d+$/.test(v),
  }), []);

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

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/productos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener productos");
      setItems(data);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchItems(); }, [token]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const resetForm = () => setForm({
    codigo: "", nombre: "", categoria: "", marca: "",
    precio_compra: "", precio_venta: "", stock_inicial: "", descripcion: ""
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
      const res = await fetch(`${API}/api/productos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          precio_compra: parseFloat(form.precio_compra),
          precio_venta: parseFloat(form.precio_venta),
          stock_inicial: parseInt(form.stock_inicial, 10),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear producto");
      setItems((arr) => [body, ...arr]);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err.message || "Error al crear producto");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return <p style={{ padding: 16 }}>Necesitas iniciar sesión.</p>;

  return (
    <div style={{ width: "100%", padding: 24, background: "#eef2ff", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#1e3a8a" }}>Productos</h1>
          <small style={{ color: "#64748b" }}>API: <code>{API}</code></small>
        </div>
        <button style={buttonBlue} onClick={() => { setError(""); setOpen(true); }}>Agregar producto</button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0, color: "#1e40af" }}>Listado</h3>
        {loading ? (
          <p>Cargando...</p>
        ) : items.length === 0 ? (
          <p>No hay productos.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background: "#e5e7eb", color: "black" }}>
                  <th>ID</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Compra</th>
                  <th>Venta</th>
                  <th>Stock</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} style={{ color: "black" }}>
                    <td>{p.id}</td>
                    <td>{p.codigo}</td>
                    <td>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td>{p.marca || "-"}</td>
                    <td>${Number(p.precio_compra).toFixed(2)}</td>
                    <td>${Number(p.precio_venta).toFixed(2)}</td>
                    <td>{p.stock_inicial}</td>
                    <td>{new Date(p.fecha_registro).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <div style={backdrop}>
          <div style={modal} role="dialog" aria-modal>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Agregar producto</h3>
              <button onClick={() => setOpen(false)} style={buttonGhost}>✕</button>
            </div>

            {error && <div style={alert}>{error}</div>}

            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <div style={gridResponsive}>
                <Field label="Código" htmlFor="codigo">
                  <input id="codigo" name="codigo" value={form.codigo} onChange={onChange} style={input} />
                </Field>
                <Field label="Nombre" htmlFor="nombre">
                  <input id="nombre" name="nombre" value={form.nombre} onChange={onChange} style={input} />
                </Field>
              </div>

              <div style={gridResponsive}>
                <Field label="Categoría" htmlFor="categoria">
                  <input id="categoria" name="categoria" value={form.categoria} onChange={onChange} style={input} />
                </Field>
                <Field label="Marca" htmlFor="marca">
                  <input id="marca" name="marca" value={form.marca} onChange={onChange} style={input} />
                </Field>
              </div>

              <div style={gridResponsive}>
                <Field label="Precio compra" htmlFor="precio_compra">
                  <input id="precio_compra" name="precio_compra" inputMode="decimal" value={form.precio_compra}
                         onChange={onChange} style={input} placeholder="0.00" />
                </Field>
                <Field label="Precio venta" htmlFor="precio_venta">
                  <input id="precio_venta" name="precio_venta" inputMode="decimal" value={form.precio_venta}
                         onChange={onChange} style={input} placeholder="0.00" />
                </Field>
                <Field label="Stock inicial" htmlFor="stock_inicial">
                  <input id="stock_inicial" name="stock_inicial" inputMode="numeric" value={form.stock_inicial}
                         onChange={(e) => setForm(f => ({ ...f, stock_inicial: e.target.value.replace(/\\D/g, '') }))}
                         style={input} placeholder="0" />
                </Field>
              </div>

              <Field label="Descripción" htmlFor="descripcion">
                <textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={onChange}
                          style={{ ...input, minHeight: 80 }} />
              </Field>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setOpen(false); resetForm(); setError(""); }} style={buttonGray}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={buttonBlue}>
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "#1f2937" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// estilos reutilizados
const card = { background: "white", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", width: "100%" };
const alert = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
const gridResponsive = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const input = { padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" };
const buttonBlue = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" };
const buttonGray = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f3f4f6", color: "#111827", cursor: "pointer" };
const buttonGhost = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" };
const table = { width: "100%", borderCollapse: "collapse" };
const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modal = { background: "white", borderRadius: 12, border: "1px solid #e5e7eb", width: "min(820px, 100%)", padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" };
