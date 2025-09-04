import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function EmployeeDashboard({ token, user }) {
  const [profile, setProfile] = useState(user || null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (profile) return; // ya lo tenemos desde App
    (async () => {
      try {
        setErr("");
        const res = await fetch(`${API}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Error cargando perfil");
        setProfile(body.user);
      } catch (e) {
        setErr(e.message || "Error");
      }
    })();
  }, [token]);

  if (err) return <div style={alert}>{err}</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        <p>Hola <strong>{profile?.nombre_completo || user?.nombre_completo}</strong>, este es tu panel de empleado.</p>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Tu información</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><b>Usuario:</b> {profile?.usuario || user?.usuario}</li>
          <li><b>Rol:</b> {profile?.rol || user?.rol}</li>
          <li><b>Estado:</b> {profile?.estado || user?.estado}</li>
          <li><b>Registro:</b> {profile?.fecha_registro ? new Date(profile.fecha_registro).toLocaleString() : ""}</li>
        </ul>
      </div>
    </div>
  );
}

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const alert = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 10, borderRadius: 8, marginBottom: 8 };
