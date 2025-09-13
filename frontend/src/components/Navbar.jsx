import { useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Navbar() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        {/* Logo + Nombre */}
        <a href="#" className="flex items-center gap-2">
          {/* Logo grande pero no desproporcionado */}
          <img src={logo} alt="Logo" className="h-12 w-auto" />
          {/* Texto un poco más pequeño */}
          <span className="text-lg font-semibold text-white tracking-wide">
            Advanced Technology
          </span>
        </a>

        {/* Links */}
        <div className="flex gap-6 text-white text-lg">
          <a href="#" className="hover:text-sapphire-300 transition-colors">
            Inicio
          </a>
          <a href="#" className="hover:text-sapphire-300 transition-colors">
            Nosotros
          </a>
          <a
            href="/login"
            className={`transition-colors ${
              isLogin
                ? "text-sapphire-300"
                : "hover:text-sapphire-300 underline underline-offset-4"
            }`}
          >
            Acceder al sistema
          </a>
        </div>
      </div>
    </nav>
  );
}
