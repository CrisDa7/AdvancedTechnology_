import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout({ user, onLogout }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ background: "#0f172a", color: "white", padding: 16 }}>
        {/* Marca y rol */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, lineHeight: 1.1 }}>Advanced Technology</h2>
          <div style={{
            marginTop: 6,
            display: "inline-block",
            fontSize: 12,
            color: "#cbd5e1",
            background: "#1e293b",
            border: "1px solid #334155",
            padding: "2px 8px",
            borderRadius: 999,
          }}>
            {capitalize(user?.rol)}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "grid", gap: 8 }}>
          <NavItem to="/admin">Dashboard</NavItem>
          <NavItem to="/admin/usuarios">Usuarios</NavItem>
          <NavItem to="/admin/productos">Productos</NavItem>
          <NavItem to="/admin/ventas">Ventas</NavItem>
          <NavItem to="/admin/servicios">Servicios</NavItem>


        </nav>
      </aside>

      {/* Contenido */}
      <main style={{ background: "#f1f5f9" }}>
        {/* Topbar */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Bienvenido, {user?.nombre_completo}</strong>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "white",
              cursor: "pointer"
            }}
          >
            Salir
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "10px 12px",
        borderRadius: 8,
        textDecoration: "none",
        color: "white",
        background: isActive ? "#1d4ed8" : "transparent",
      })}
    >
      {children}
    </NavLink>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
