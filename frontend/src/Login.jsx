import { useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login({ onSuccess }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error de login");
      onSuccess(body.user, body.token);
    } catch (e) {
      setError(e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 16, background: "white", border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <h2>Iniciar sesión</h2>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={input} />
        <input placeholder="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} style={input} />
        <button type="submit" disabled={loading} style={button}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const input = { padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" };
const button = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "white", cursor: "pointer" };
