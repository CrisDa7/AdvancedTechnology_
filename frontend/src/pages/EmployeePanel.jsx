export default function EmployeePanel({ user, onLogout }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h2>Panel de empleado</h2>
      <p>Hola {user?.nombre_completo}, este es tu panel de empleado.</p>
    </div>
  );
}
