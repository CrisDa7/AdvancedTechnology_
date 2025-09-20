// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout.jsx";
import EmployeeLayout from "./layouts/EmployeeLayout.jsx";
import ClientLayout from "./layouts/ClientLayout.jsx";

// === En raíz de src
import Login from "./Login.jsx";
import UsersPage from "./UsersPage.jsx";
import ProductsPage from "./ProductsPage.jsx";
import SalesPage from "./SalesPage.jsx";
import ServicesPage from "./ServicesPage.jsx";

// === Dentro de /pages
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import ClientServicesPage from "./pages/ClientServicesPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/profile`, {
          headers: { Authorization: `Bearer ${t}` },
        });
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

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="*" element={<Login onSuccess={handleLogin} />} />
        </Routes>
      ) : user.rol === "administrador" ? (
        <Routes>
          <Route path="/admin" element={<AdminLayout user={user} onLogout={logout} />}>
            <Route index element={<AdminDashboard token={token} />} />
            <Route path="usuarios" element={<UsersPage token={token} />} />
            <Route path="productos" element={<ProductsPage token={token} />} />
            <Route path="ventas" element={<SalesPage token={token} />} />
            <Route path="servicios" element={<ServicesPage token={token} />} />
            <Route path="inventario" element={<InventoryPage token={token} />} />
            <Route path="reportes" element={<ReportsPage token={token} />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : user.rol === "empleado" ? (
        <Routes>
          <Route path="/empleado" element={<EmployeeLayout user={user} onLogout={logout} />}>
            <Route index element={<EmployeeDashboard token={token} user={user} />} />
            <Route path="productos" element={<ProductsPage token={token} />} />
            <Route path="ventas" element={<SalesPage token={token} />} />
            <Route path="servicios" element={<ServicesPage token={token} />} />
            <Route path="inventario" element={<InventoryPage token={token} />} />
            <Route path="reportes" element={<ReportsPage token={token} />} />
          </Route>
          <Route path="*" element={<Navigate to="/empleado" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/cliente" element={<ClientLayout user={user} onLogout={logout} />}>
            <Route index element={<ClientDashboard token={token} user={user} />} />
            <Route path="servicios" element={<ClientServicesPage token={token} user={user} />} />
          </Route>
          <Route path="*" element={<Navigate to="/cliente" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
