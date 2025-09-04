import { useEffect, useState } from "react";
import Login from "./Login.jsx";
import UsersPage from "./UsersPage.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  // Leer token guardado y validarlo
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${t}` } });
        const body = await res.json();
        if (!res.ok) throw new Error();
        setUser(body.user);
        setToken(t);
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = (u, t) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("token", t);
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
  };

  if (loading) return <p style={{ padding: 16 }}>Cargando...</p>;

  if (!user) {
    return <Login onSuccess={handleLogin} />;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3>Bienvenido, {user.nombre_completo} ({user.rol})</h3>
        <button onClick={logout} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>Salir</button>
      </div>

      {user.rol === "administrador" ? (
        <UsersPage token={token} />
      ) : (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2>Panel de empleado</h2>
          <p>Hola {user.nombre_completo}, este es tu panel de empleado.</p>
        </div>
      )}
    </div>
  );
}
