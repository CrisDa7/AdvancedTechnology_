import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UsersPage({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre_completo: "",
    usuario: "",
    contrasena: "",
    celular: "",
    cedula: "",
    rol: "empleado",
    estado: "activo",
  });
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(
    () => ({
      nombre_completo: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
      contrasena: /[A-Z]/,
      celular: /^\d{10}$/,
      cedula: /^\d{10}$/,
      rol: ["administrador", "empleado"],
      estado: ["activo", "inactivo", "dado de baja"],
    }),
    []
  );

  const validate = () => {
    const errs = {};
    if (!rules.nombre_completo.test(form.nombre_completo)) {
      errs.nombre_completo = "Solo letras y espacios";
    }
    if (!form.usuario.trim()) {
      errs.usuario = "Usuario obligatorio";
    }
    if (!rules.contrasena.test(form.contrasena)) {
      errs.contrasena = "Debe tener al menos 1 mayúscula";
    }
    if (!rules.celular.test(form.celular)) {
      errs.celular = "El celular debe tener 10 dígitos";
    }
    if (!rules.cedula.test(form.cedula)) {
      errs.cedula = "La cédula debe tener 10 dígitos";
    }
    return errs;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("No se pudo obtener usuarios");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${API}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Error al crear usuario");
      }
      setUsers((u) => [body, ...u]);
      setForm({
        nombre_completo: "",
        usuario: "",
        contrasena: "",
        celular: "",
        cedula: "",
        rol: "empleado",
        estado: "activo",
      });
    } catch (e) {
      setError(e.message || "Error al crear usuario");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
        <p>Necesitas iniciar sesión.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20, background: "#f0f4ff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: "#1e3a8a" }}>Usuarios</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        API: <code>{API}</code>
      </p>

      {/* Formulario */}
      <form onSubmit={handleSubmit} style={card}>
        <h2 style={{ marginTop: 0, color: "#1e40af" }}>Nuevo usuario</h2>
        {error && <div style={alert}>{error}</div>}

        <div style={grid2}>
          <Field label="Nombre completo" htmlFor="nombre_completo">
            <input id="nombre_completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} style={input} />
          </Field>
          <Field label="Usuario" htmlFor="usuario">
            <input id="usuario" name="usuario" value={form.usuario} onChange={handleChange} style={input} />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Contraseña" htmlFor="contrasena">
            <input id="contrasena" name="contrasena" type="password" value={form.contrasena} onChange={handleChange} style={input} />
          </Field>
          <Field label="Celular" htmlFor="celular">
            <input id="celular" name="celular" value={form.celular} onChange={handleChange} style={input} />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Cédula" htmlFor="cedula">
            <input id="cedula" name="cedula" value={form.cedula} onChange={handleChange} style={input} />
          </Field>
          <Field label="Rol" htmlFor="rol">
            <select id="rol" name="rol" value={form.rol} onChange={handleChange} style={input}>
              <option value="empleado">Empleado</option>
              <option value="administrador">Administrador</option>
            </select>
          </Field>
        </div>

        <Field label="Estado" htmlFor="estado">
          <select id="estado" name="estado" value={form.estado} onChange={handleChange} style={input}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="dado de baja">Dado de baja</option>
          </select>
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="submit" disabled={submitting} style={buttonBlue}>
            {submitting ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={() => setForm({ nombre_completo: "", usuario: "", contrasena: "", celular: "", cedula: "", rol: "empleado", estado: "activo" })} style={buttonGray}>
            Limpiar
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div style={{ ...card, marginTop: 20 }}>
        <h2 style={{ marginTop: 0, color: "#1e40af" }}>Listado</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : users.length === 0 ? (
          <p>No hay usuarios.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background: "#e5e7eb", color: "black" }}>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Celular</th>
                  <th>Cédula</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha registro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ color: "black" }}>
                    <td>{u.id}</td>
                    <td>{u.nombre_completo}</td>
                    <td>{u.usuario}</td>
                    <td>{u.celular}</td>
                    <td>{u.cedula}</td>
                    <td>{u.rol}</td>
                    <td>{u.estado}</td>
                    <td>{new Date(u.fecha_registro).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

const card = {
  background: "white",
  border: "1px solid #dbeafe",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};

const alert = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: 10,
  borderRadius: 8,
  marginBottom: 8,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const input = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  outline: "none",
};

const buttonBlue = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
};

const buttonGray = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#f3f4f6",
  color: "#111827",
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};
