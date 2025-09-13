import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import loginVideo from "./assets/login.mp4";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login({ onSuccess }) {           // <-- RECIBE onSuccess
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), contrasena }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error de login");

      // informa al App (esto setea user/token y localStorage desde App.jsx)
      onSuccess?.(body.user, body.token);

      // navega según el rol (COINCIDE con tus rutas de App.jsx)
      const rol = body?.user?.rol;
      if (rol === "administrador") navigate("/admin");
      else if (rol === "empleado")  navigate("/empleado");
      else                          navigate("/cliente");
    } catch (e) {
      setError(e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <video
        ref={videoRef}
        src={loginVideo}
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-sapphire-950/60" />

      <Navbar />

      <main className="relative z-10 grid min-h-screen place-items-center p-4">
        <section className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl md:p-8">
          <h1 className="mb-1 text-center text-3xl font-bold">Welcome</h1>
          <p className="mb-6 text-center text-sm text-white/80">Accede a tu cuenta</p>

          <form onSubmit={submit} className="grid gap-4" noValidate>
            <input
              id="usuario"
              type="text"
              className="h-12 w-full rounded-full border border-white/30 bg-white/15 px-5 text-white placeholder-white/70 outline-none focus:border-white/90 focus:ring-2 focus:ring-sapphire-400/70"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
              autoComplete="username"
            />
            <input
              id="contrasena"
              type="password"
              className="h-12 w-full rounded-full border border-white/30 bg-white/15 px-5 text-white placeholder-white/70 outline-none focus:border-white/90 focus:ring-2 focus:ring-sapphire-400/70"
              placeholder="Password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg border border-white/30 bg-red-600/90 px-4 py-2 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-gradient-to-tr from-sapphire-700 via-sapphire-600 to-sapphire-400 font-extrabold text-white shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {loading ? "Entrando..." : "LOGIN"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
