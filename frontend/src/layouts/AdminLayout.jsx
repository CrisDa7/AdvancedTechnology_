import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

const links = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/usuarios", label: "Usuarios" },
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/ventas", label: "Ventas" },
  { to: "/admin/servicios", label: "Servicios" },
  { to: "/admin/inventario", label: "Inventario" },
  { to: "/admin/reportes", label: "Reportes" },
];

export default function AdminLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const linkClass = (isActive) =>
    [
      "rounded-lg px-3 py-2 text-sm font-medium transition",
      isActive ? "bg-sapphire-700/90" : "text-white hover:bg-white/10",
    ].join(" ");

  return (
    <div className="min-h-screen bg-sapphire-50 text-slate-900">
      {/* Header (mismo color que sidebar, sin borde) */}
      <header className="sticky top-0 z-40 h-[60px] bg-sapphire-950 text-white">
        <div className="flex w-full items-center justify-between px-4 py-3">
          {/* Brand */}
          <button
            className="flex items-center gap-3"
            onClick={() => navigate("/admin")}
            aria-label="Ir al dashboard"
          >
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold">Advanced Technology</span>
              <span className="text-xs text-sapphire-200">
                {capitalize(user?.rol)}
              </span>
            </div>
          </button>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-sapphire-200 md:block">
              Bienvenido, <strong className="text-white">{user?.nombre_completo}</strong>
            </span>
            <button
              onClick={() => {
                onLogout();
                navigate("/login");
              }}
              className="rounded-lg bg-sapphire-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 active:translate-y-px"
            >
              Salir
            </button>

            {/* Toggle móvil */}
            <button
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sapphire-700 bg-sapphire-900 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              <span className="text-xl leading-none">≡</span>
            </button>
          </div>
        </div>
      </header>

      {/* Layout 2 columnas */}
      <div className="grid w-full grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar desktop */}
        <aside className="hidden bg-sapphire-950 text-white md:block">
          <nav className="sticky top-[60px] flex h-[calc(100vh-60px)] flex-col gap-1 p-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/admin"}                // <- Solo dashboard es exacto
                className={({ isActive }) => linkClass(isActive)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Sidebar móvil */}
        {open && (
          <aside className="bg-sapphire-950 text-white md:hidden">
            <nav className="grid gap-1 p-3">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/admin"}              // <- también en móvil
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* Contenido */}
        <main className="min-h-[calc(100vh-60px)] bg-sapphire-50">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
