import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function SalesPage({ token }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formulario
  const [form, setForm] = useState({
    cliente_nombre: "",
    cedula: "",
    telefono: "",
    producto_id: null,
    producto_label: "",
    cantidad: "1",
    precio_unitario: "", // opcional; si lo dejas vacío usa el precio del producto
    descripcion: "",
  });

  // Buscador de productos
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fetchingSug, setFetchingSug] = useState(false);
  const debouncedQ = useDebounce(q, 300);

  const rules = useMemo(() => ({
    nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
    cedula: /^\d{10}$/,
    telefono: /^\d{10}$/,
    enteroPos: (v) => /^\d+$/.test(v) && Number(v) >= 1,
    precio: (v) => v === "" || /^(\d+)(\.\d{1,2})?$/.test(v),
  }), []);

  const validate = () => {
    const e = {};
    if (!rules.nombre.test(form.cliente_nombre)) e.cliente_nombre = "Nombre: solo letras y espacios";
    if (!rules.cedula.test(form.cedula)) e.cedula = "Cédula: 10 dígitos";
    if (!rules.telefono.test(form.telefono)) e.telefono = "Teléfono: 10 dígitos";
    if (!form.producto_id) e.producto_id = "Selecciona un producto";
    if (!rules.enteroPos(form.cantidad)) e.cantidad = "Cantidad ≥ 1 (entero)";
    if (!rules.precio(String(form.precio_unitario))) e.precio_unitario = "Precio inválido (máx 2 decimales)";
    return e;
  };

  // Cargar ventas recientes
  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/ventas`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener ventas");
      setVentas(data);
    } catch (err) {
      setError(err.message || "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (token) fetchVentas(); }, [token]);

  // Buscar productos (código o nombre)
  useEffect(() => {
    (async () => {
      if (!debouncedQ) { setSuggestions([]); return; }
      try {
        setFetchingSug(true);
        const res = await fetch(`${API}/api/productos/search?q=${encodeURIComponent(debouncedQ)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setSuggestions(data);
      } finally {
        setFetchingSug(false);
      }
    })();
  }, [debouncedQ, token]);

  const pickProduct = (p) => {
    setForm(f => ({
      ...f,
      producto_id: p.id,
      producto_label: `${p.codigo} — ${p.nombre}`,
      precio_unitario: p.precio_venta?.toString() ?? "",
    }));
    setQ("");
    setSuggestions([]);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "cedula" || name === "telefono") {
      return setForm(f => ({ ...f, [name]: value.replace(/\D/g, "").slice(0, 10) }));
    }
    if (name === "cantidad") {
      return setForm(f => ({ ...f, [name]: value.replace(/\D/g, "") }));
    }
    setForm(f => ({ ...f, [name]: value }));
  };

  const resetForm = () => setForm({
    cliente_nombre: "",
    cedula: "",
    telefono: "",
    producto_id: null,
    producto_label: "",
    cantidad: "1",
    precio_unitario: "",
    descripcion: "",
  });

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
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        descripcion: form.descripcion || undefined,
      };
      if (form.precio_unitario !== "") {
        payload.precio_unitario = Number(form.precio_unitario);
      }

      const res = await fetch(`${API}/api/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear venta");

      setVentas(v => [body, ...v]);   // agrega arriba
      resetForm();
      setOpen(false);
      // window.alert("Venta registrada"); // opcional
    } catch (err) {
      setError(err.message || "Error al crear venta");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return <p style={{ padding: 16 }}>Necesitas iniciar sesión.</p>;

  return (
    <div style={{ width: "100%", padding: 24, background: "#eef2ff", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#1e3a8a" }}>Ventas</h1>
          <small style={{ color: "#64748b" }}>API: <code>{API}</code></small>
        </div>
        <button style={buttonBlue} onClick={() => { setError(""); setOpen(true); }}>Agregar venta</button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0, color: "#1e40af" }}>Últimas ventas</h3>
        {loading ? (
          <p>Cargando...</p>
        ) : ventas.length === 0 ? (
          <p>No hay ventas.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background: "#e5e7eb", color: "black" }}>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Cédula</th>
                  <th>Teléfono</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} style={{ color: "black" }}>
                    <td>{new Date(v.fecha_venta).toLocaleString()}</td>
                    <td>{v.cliente_nombre}</td>
                    <td>{v.cedula}</td>
                    <td>{v.telefono}</td>
                    <td>{v.producto_nombre}</td>
                    <td>{v.cantidad}</td>
                    <td>${Number(v.precio_unitario).toFixed(2)}</td>
                    <td>${Number(v.total).toFixed(2)}</td>
                    <td>{v.descripcion || "-"}</td>
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
              <h3 style={{ margin: 0 }}>Agregar venta</h3>
              <button onClick={() => setOpen(false)} style={buttonGhost}>✕</button>
            </div>

            {error && <div style={alertBox}>{error}</div>}

            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <div style={grid}>
                <Field label="Nombre del cliente" htmlFor="cliente_nombre">
                  <input id="cliente_nombre" name="cliente_nombre" value={form.cliente_nombre} onChange={onChange} style={input} />
                </Field>
                <Field label="Cédula (10 dígitos)" htmlFor="cedula">
                  <input id="cedula" name="cedula" value={form.cedula} onChange={onChange} style={input} />
                </Field>
                <Field label="Teléfono (10 dígitos)" htmlFor="telefono">
                  <input id="telefono" name="telefono" value={form.telefono} onChange={onChange} style={input} />
                </Field>
              </div>

              {/* Buscador por código o nombre */}
              <div style={{ position: "relative" }}>
                <Field label="Producto (código o nombre)" htmlFor="producto_search">
                  <input
                    id="producto_search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ej: PR0001, Mouse"
                    style={input}
                  />
                </Field>

                {(suggestions.length > 0 || fetchingSug) && (
                  <div style={dropdown}>
                    {fetchingSug && <div style={sugItem}>Buscando...</div>}
                    {suggestions.map(s => (
                      <div key={s.id} style={sugItem} onClick={() => pickProduct(s)}>
                        <div><b>{s.codigo}</b> — {s.nombre}</div>
                        <small>${Number(s.precio_venta).toFixed(2)}</small>
                      </div>
                    ))}
                  </div>
                )}

                {form.producto_label && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                    Seleccionado: <b>{form.producto_label}</b>
                  </div>
                )}
              </div>

              <div style={grid}>
                <Field label="Cantidad" htmlFor="cantidad">
                  <input id="cantidad" name="cantidad" value={form.cantidad} onChange={onChange} style={input} />
                </Field>
                <Field label="Precio unitario (opcional)" htmlFor="precio_unitario">
                  <input id="precio_unitario" name="precio_unitario" value={form.precio_unitario} onChange={onChange} style={input} placeholder="Auto si lo dejas vacío" />
                </Field>
              </div>

              <Field label="Descripción" htmlFor="descripcion">
                <textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={onChange} style={{ ...input, minHeight: 80 }} />
              </Field>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setOpen(false); resetForm(); setError(""); }} style={buttonGray}>Cancelar</button>
                <button type="submit" disabled={submitting} style={buttonBlue}>{submitting ? "Guardando..." : "Guardar"}</button>
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

function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/* estilos */
const card = { background: "white", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", width: "100%" };
const table = { width: "100%", borderCollapse: "collapse" };
const alertBox = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
const input = { padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" };
const buttonBlue = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" };
const buttonGray = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f3f4f6", color: "#111827", cursor: "pointer" };
const buttonGhost = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" };

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 9999
};
const modal = {
  background: "white",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  width: "min(820px, 100%)",
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  zIndex: 10000
};
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const dropdown = { position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 20px rgba(0,0,0,.08)", marginTop: 6, maxHeight: 240, overflowY: "auto", zIndex: 50 };
const sugItem = { padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" };
