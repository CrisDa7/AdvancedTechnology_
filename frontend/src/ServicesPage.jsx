import { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ServicesPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nombre_completo: "", usuario: "", contrasena: "",
    ciudad: "", telefono: "", cedula: "", direccion: "",
    tipo_equipo: "", modelo: "",
    descripcion_equipo: "", proceso: "",
    valor_total: "", pago_tipo: "abono", monto_abono: "0",
    observaciones: ""
  });

  const rules = useMemo(() => ({
    nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
    solo10: /^\d{10}$/,
    mayus: /[A-Z]/,
    dinero: (v) => /^(\d+)(\.\d{1,2})?$/.test(v),
  }), []);

  const validate = () => {
    const e = {};
    if (!rules.nombre.test(form.nombre_completo)) e.nombre_completo = "Nombre: solo letras y espacios";
    if (!form.usuario.trim()) e.usuario = "Usuario obligatorio";
    if (!rules.mayus.test(form.contrasena)) e.contrasena = "Contraseña con 1 mayúscula";
    if (!rules.nombre.test(form.ciudad)) e.ciudad = "Ciudad: solo letras y espacios";
    if (!rules.solo10.test(form.telefono)) e.telefono = "Teléfono: 10 dígitos";
    if (!rules.solo10.test(form.cedula)) e.cedula = "Cédula: 10 dígitos";
    if (!form.direccion.trim()) e.direccion = "Dirección obligatoria";
    if (!form.tipo_equipo.trim()) e.tipo_equipo = "Tipo de equipo obligatorio";
    if (!form.modelo.trim()) e.modelo = "Modelo obligatorio";
    if (!form.descripcion_equipo.trim()) e.descripcion_equipo = "Descripción obligatoria";
    if (!form.proceso.trim()) e.proceso = "Proceso obligatorio";
    if (!rules.dinero(form.valor_total)) e.valor_total = "Total inválido";
    if (form.pago_tipo === "abono" && !rules.dinero(form.monto_abono)) e.monto_abono = "Abono inválido";
    if (form.pago_tipo === "abono" && parseFloat(form.monto_abono) > parseFloat(form.valor_total)) e.monto_abono = "Abono > Total";
    return e;
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/servicios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener servicios");
      setItems(data);
    } catch (err) {
      setError(err.message || "Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (token) fetchItems(); }, [token]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "telefono" || name === "cedula") {
      return setForm(f => ({ ...f, [name]: value.replace(/\D/g, "").slice(0, 10) }));
    }
    setForm(f => ({ ...f, [name]: value }));
  };

  const resetForm = () => setForm({
    nombre_completo: "", usuario: "", contrasena: "",
    ciudad: "", telefono: "", cedula: "", direccion: "",
    tipo_equipo: "", modelo: "",
    descripcion_equipo: "", proceso: "",
    valor_total: "", pago_tipo: "abono", monto_abono: "0",
    observaciones: ""
  });

  const restantePreview = (() => {
    const t = parseFloat(form.valor_total || "0");
    const ab = form.pago_tipo === "abono" ? parseFloat(form.monto_abono || "0") : t;
    const r = t - ab;
    return isNaN(r) ? "" : r.toFixed(2);
  })();

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);
    try {
      setSubmitting(true);
      setError("");
      const payload = {
        ...form,
        valor_total: Number(form.valor_total),
        monto_abono: form.pago_tipo === "abono" ? Number(form.monto_abono || 0) : undefined
      };
      const res = await fetch(`${API}/api/servicios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear servicio");
      setItems(list => [body, ...list]);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err.message || "Error al crear servicio");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return <p style={{ padding: 16 }}>Necesitas iniciar sesión.</p>;

  return (
    <div style={{ width: "100%", padding: 24, background: "#eef2ff", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#1e3a8a" }}>Servicios</h1>
          <small style={{ color: "#64748b" }}>API: <code>{API}</code></small>
        </div>
        <button style={buttonBlue} onClick={() => { setError(""); setOpen(true); }}>Agregar servicio</button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0, color: "#1e40af" }}>Listado</h3>
        {loading ? (
          <p>Cargando...</p>
        ) : items.length === 0 ? (
          <p>No hay servicios.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background: "#e5e7eb", color: "black" }}>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Modelo</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Abono</th>
                  <th>Restante</th>
                </tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} style={{ color: "black" }}>
                    <td>{new Date(s.fecha_recepcion).toLocaleString()}</td>
                    <td>{s.codigo}</td>
                    <td>{s.nombre_completo}</td>
                    <td>{s.tipo_equipo}</td>
                    <td>{s.modelo}</td>
                    <td>{s.pago_tipo}</td>
                    <td>{s.estado}</td>
                    <td>${Number(s.valor_total).toFixed(2)}</td>
                    <td>${Number(s.monto_abono).toFixed(2)}</td>
                    <td>${Number(s.valor_restante).toFixed(2)}</td>
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
              <h3 style={{ margin: 0 }}>Agregar servicio</h3>
              <button onClick={() => setOpen(false)} style={buttonGhost}>✕</button>
            </div>

            {error && <div style={alertBox}>{error}</div>}

            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <div style={grid}>
                <Field label="Nombre completo"><input name="nombre_completo" value={form.nombre_completo} onChange={onChange} style={input} /></Field>
                <Field label="Usuario"><input name="usuario" value={form.usuario} onChange={onChange} style={input} /></Field>
                <Field label="Contraseña (1 mayúscula)"><input type="password" name="contrasena" value={form.contrasena} onChange={onChange} style={input} /></Field>
              </div>

              <div style={grid}>
                <Field label="Ciudad"><input name="ciudad" value={form.ciudad} onChange={onChange} style={input} /></Field>
                <Field label="Teléfono (10 dígitos)"><input name="telefono" value={form.telefono} onChange={onChange} style={input} /></Field>
                <Field label="Cédula (10 dígitos)"><input name="cedula" value={form.cedula} onChange={onChange} style={input} /></Field>
              </div>

              <Field label="Dirección"><input name="direccion" value={form.direccion} onChange={onChange} style={input} /></Field>

              <Field label="Observaciones (opcional)">
                <textarea name="observaciones" value={form.observaciones} onChange={onChange} style={{ ...input, minHeight: 60 }} />
              </Field>

              <div style={grid}>
                <Field label="Tipo de equipo"><input name="tipo_equipo" value={form.tipo_equipo} onChange={onChange} style={input} /></Field>
                <Field label="Modelo"><input name="modelo" value={form.modelo} onChange={onChange} style={input} /></Field>
              </div>

              <Field label="Descripción de equipo">
                <textarea name="descripcion_equipo" value={form.descripcion_equipo} onChange={onChange} style={{ ...input, minHeight: 80 }} />
              </Field>

              <Field label="Proceso">
                <textarea name="proceso" value={form.proceso} onChange={onChange} style={{ ...input, minHeight: 80 }} />
              </Field>

              <div style={grid}>
                <Field label="Valor total">
                  <input name="valor_total" inputMode="decimal" value={form.valor_total} onChange={onChange} style={input} placeholder="0.00" />
                </Field>
                <Field label="Pago">
                  <select name="pago_tipo" value={form.pago_tipo} onChange={onChange} style={input}>
                    <option value="abono">Abono</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </Field>
                {form.pago_tipo === "abono" && (
                  <Field label="Monto abono">
                    <input name="monto_abono" inputMode="decimal" value={form.monto_abono} onChange={onChange} style={input} placeholder="0.00" />
                  </Field>
                )}
              </div>

              <div style={{ fontSize: 13, color: "#334155" }}>
                Restante (previo): <b>${restantePreview}</b>
              </div>

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

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "#1f2937" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// estilos
const card = { background: "white", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", width: "100%" };
const table = { width: "100%", borderCollapse: "collapse" };
const alertBox = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
const input = { padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" };
const buttonBlue = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" };
const buttonGray = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f3f4f6", color: "#111827", cursor: "pointer" };
const buttonGhost = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" };
const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 9999 };
const modal = { background: "white", borderRadius: 12, border: "1px solid #e5e7eb", width: "min(900px, 100%)", padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", zIndex: 10000 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
