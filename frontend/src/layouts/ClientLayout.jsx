import { NavLink, Outlet } from "react-router-dom";

export default function ClientLayout({ user, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "260px 1fr", background: "#eef2ff" }}>
      {/* Sidebar */}
      <aside style={{ background: "#1d4ed8", color: "white", padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Advanced Technology</div>
        <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 16 }}>Panel de cliente</div>

        <nav style={{ display: "grid", gap: 6 }}>
          <NavItem to="/cliente" label="Resumen" />
          <NavItem to="/cliente/servicios" label="Mis servicios" />
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={onLogout}
            style={{ marginTop: 16, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "white", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main style={{ padding: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e3a8a" }}>Bienvenido, {user?.nombre_completo}</h1>
            <small style={{ color: "#475569" }}>Rol: cliente</small>
          </div>
        </header>

        <section style={{ maxWidth: 1200, marginInline: "auto" }}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "block",
        padding: "10px 12px",
        borderRadius: 10,
        textDecoration: "none",
        color: "white",
        background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
        fontWeight: isActive ? 700 : 500,
      })}
    >
      {label}
    </NavLink>
  );
}
