// src/pages/UsersPage.jsx
// Gestión de usuarios (admin)
// - Lista, filtros locales, crear/editar, cambiar estado, eliminar (reglas del backend)
// - Comentarios inline para que sepas qué hace cada bloque

import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UsersPage({ token }) {
  /* --------------------------- estado principal --------------------------- */
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Para evitar fugas si navegas rápido
  const abortRef = useRef(null);

  // Ocultar visualmente (no borra en BD) cuando el estado es "inactivo"
  const [hiddenIds, setHiddenIds] = useState(() => new Set());

  /* ------------------------------- crear --------------------------------- */
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "",
    usuario: "",
    contrasena: "",
    celular: "",
    cedula: "",
    rol: "empleado",
    estado: "activo",
  });

  /* ------------------------------- editar -------------------------------- */
  const [openEdit, setOpenEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    id: null,
    nombre_completo: "",
    usuario: "",
    contrasena: "", // opcional
    celular: "",
    cedula: "",
    rol: "empleado",
    estado: "activo",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  /* --------------------------- cambiar estado ---------------------------- */
  const [openEstado, setOpenEstado] = useState(false);
  const [estadoUser, setEstadoUser] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("activo");
  const [savingEstado, setSavingEstado] = useState(false);

  /* ------------------------------- historial ----------------------------- */
  const [openInfo, setOpenInfo] = useState(false);
  const [infoUser, setInfoUser] = useState(null);

  /* -------------------------------- filtros ------------------------------ */
  const [fNombre, setFNombre] = useState("");
  const [fCedula, setFCedula] = useState("");
  const [fRol, setFRol] = useState("Todos");
  const [fEstado, setFEstado] = useState("Todos");

  const [q, setQ] = useState({
    nombre: "",
    cedula: "",
    rol: "Todos",
    estado: "Todos",
  });

  /* ---------------------------- validaciones ----------------------------- */
  const rules = useMemo(
    () => ({
      nombre_completo: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
      contrasena: /[A-Z]/, // al menos 1 mayúscula
      celular: /^\d{10}$/,
      cedula: /^\d{10}$/,
      rol: ["administrador", "empleado"],
      estado: ["activo", "inactivo", "dado de baja"],
    }),
    []
  );

  const validateCreate = () => {
    const errs = {};
    if (!rules.nombre_completo.test(form.nombre_completo)) errs.nombre_completo = "Solo letras y espacios";
    if (!form.usuario.trim()) errs.usuario = "Usuario obligatorio";
    if (!rules.contrasena.test(form.contrasena)) errs.contrasena = "Debe tener al menos 1 mayúscula";
    if (!rules.celular.test(form.celular)) errs.celular = "El celular debe tener 10 dígitos";
    if (!rules.cedula.test(form.cedula)) errs.cedula = "La cédula debe tener 10 dígitos";
    return errs;
  };

  const validateEdit = () => {
    const errs = {};
    if (!rules.nombre_completo.test(editForm.nombre_completo)) errs.nombre_completo = "Solo letras y espacios";
    if (!editForm.usuario.trim()) errs.usuario = "Usuario obligatorio";
    if (editForm.contrasena && !rules.contrasena.test(editForm.contrasena)) errs.contrasena = "Contraseña con 1 mayúscula";
    if (!rules.celular.test(editForm.celular)) errs.celular = "El celular debe tener 10 dígitos";
    if (!rules.cedula.test(editForm.cedula)) errs.cedula = "La cédula debe tener 10 dígitos";
    if (!rules.rol.includes(editForm.rol)) errs.rol = "Rol inválido";
    if (!rules.estado.includes(editForm.estado)) errs.estado = "Estado inválido";
    return errs;
  };

  /* ---------------------------- utilidades UI ---------------------------- */
  // Solo dígitos para campos numéricos (celular/cedula)
  const onlyDigits = (v, max = 10) => v.replace(/\D/g, "").slice(0, max);

  /* --------------------------------- data -------------------------------- */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("No se pudo obtener usuarios");
      const data = await res.json();
      setUsers(data);
      setHiddenIds(new Set()); // resetea ocultos al refrescar
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ------------------------------- crear --------------------------------- */
  const onChangeCreate = (e) => {
    const { name, value } = e.target;
    if (name === "celular" || name === "cedula") {
      return setForm((f) => ({ ...f, [name]: onlyDigits(value) }));
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const resetCreate = () =>
    setForm({
      nombre_completo: "",
      usuario: "",
      contrasena: "",
      celular: "",
      cedula: "",
      rol: "empleado",
      estado: "activo",
    });

  const submitCreate = async (e) => {
    e.preventDefault();
    const errs = validateCreate();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);
    if (!window.confirm("¿Seguro que deseas crear este usuario?")) return;

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${API}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear usuario");
      setUsers((u) => [body, ...u]);
      resetCreate();
      setOpenCreate(false);
    } catch (e) {
      setError(e.message || "Error al crear usuario");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- editar -------------------------------- */
  const openEditFor = (u) => {
    setEditUser(u);
    setEditForm({
      id: u.id,
      nombre_completo: u.nombre_completo,
      usuario: u.usuario,
      contrasena: "", // vacío -> no cambia
      celular: String(u.celular || ""),
      cedula: String(u.cedula || ""),
      rol: u.rol,
      estado: u.estado,
    });
    setError("");
    setOpenEdit(true);
  };

  const onChangeEdit = (e) => {
    const { name, value } = e.target;
    if (name === "celular" || name === "cedula") {
      return setEditForm((f) => ({ ...f, [name]: onlyDigits(value) }));
    }
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);
    if (!window.confirm("¿Seguro que deseas actualizar la información?")) return;

    try {
      setSavingEdit(true);
      setError("");

      const payload = {
        nombre_completo: editForm.nombre_completo,
        usuario: editForm.usuario,
        celular: editForm.celular,
        cedula: editForm.cedula,
        rol: editForm.rol,
        estado: editForm.estado, // aunque en UI está deshabilitado
      };
      if (editForm.contrasena) payload.contrasena = editForm.contrasena;

      const res = await fetch(`${API}/api/users/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al actualizar");

      setUsers((list) => list.map((x) => (x.id === body.id ? body : x)));
      setOpenEdit(false);
      setEditUser(null);
    } catch (e) {
      setError(e.message || "Error al actualizar usuario");
    } finally {
      setSavingEdit(false);
    }
  };

  /* --------------------------- cambiar estado ---------------------------- */
  const openEstadoFor = (u) => {
    setEstadoUser(u);
    setNuevoEstado(u.estado);
    setError("");
    setOpenEstado(true);
  };

  const submitEstado = async (e) => {
    e.preventDefault();
    if (!estadoUser) return;
    if (!window.confirm(`¿Actualizar estado de ${estadoUser.usuario} a "${nuevoEstado}"?`)) return;

    try {
      setSavingEstado(true);
      setError("");
      const res = await fetch(`${API}/api/users/${estadoUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error actualizando estado");

      setUsers((list) => list.map((x) => (x.id === body.id ? body : x)));
      // Si estaba oculto y ahora cambió, vuelve a aparecer
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(body.id);
        return n;
      });
      setOpenEstado(false);
      setEstadoUser(null);
    } catch (e) {
      setError(e.message || "Error al actualizar estado");
    } finally {
      setSavingEstado(false);
    }
  };

  /* -------------------------------- borrar ------------------------------- */
  const deleteUser = async (u) => {
    if (u.estado === "activo") return;

    if (u.estado === "inactivo") {
      // Ocultar en UI (no elimina en BD)
      if (!window.confirm(`Quitar a "${u.usuario}" de la lista (no elimina en BD)?`)) return;
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.add(u.id);
        return n;
      });
      alert("Ocultado de la lista. Usa 'Refrescar' o filtra por Estado=Inactivo para verlo nuevamente.");
      return;
    }

    // "dado de baja" → elimina en BD
    if (!window.confirm(`Eliminar PERMANENTEMENTE a "${u.usuario}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API}/api/users/${u.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "No se pudo eliminar");
      setUsers((list) => list.filter((x) => x.id !== u.id));
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(u.id);
        return n;
      });
    } catch (e) {
      setError(e.message || "Error eliminando usuario");
    }
  };

  /* ------------------------------- historial ----------------------------- */
  const openInfoFor = (u) => {
    setInfoUser(u);
    setOpenInfo(true);
  };

  /* -------------------------------- filtros ------------------------------ */
  const aplicarFiltros = () => {
    setQ({
      nombre: fNombre.trim(),
      cedula: fCedula.trim(),
      rol: fRol,
      estado: fEstado,
    });
  };

  const limpiarFiltros = () => {
    setFNombre("");
    setFCedula("");
    setFRol("Todos");
    setFEstado("Todos");
    setQ({ nombre: "", cedula: "", rol: "Todos", estado: "Todos" });
  };

  // Filtro en memoria (useMemo evita recomputar si nada relevante cambió)
  const filtered = useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase();
    return users.filter((u) => {
      // Excluir ocultos si no hay filtro por estado
      if (q.estado === "Todos" && hiddenIds.has(u.id)) return false;

      if (q.nombre && !norm(u.nombre_completo).includes(norm(q.nombre))) return false;
      if (q.cedula && !String(u.cedula || "").startsWith(q.cedula)) return false;
      if (q.rol !== "Todos" && u.rol !== q.rol.toLowerCase()) return false;
      if (q.estado !== "Todos" && u.estado !== q.estado.toLowerCase()) return false;

      return true;
    });
  }, [users, q, hiddenIds]);

  /* -------------------------------- renders ------------------------------ */
  if (!token) {
    return (
      <div className="w-full px-6 py-6">
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
          Necesitas iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-6 py-6 md:px-8 xl:px-10">
        {/* Título */}
        <h1 className="mb-4 text-2xl font-bold text-sapphire-900">Usuarios</h1>

        {/* Header de acciones */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h2 className="m-0 text-lg font-semibold text-sapphire-800">Gestión de usuarios</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
            >
              Refrescar
            </button>
            <button
              onClick={() => {
                setError("");
                setOpenCreate(true);
              }}
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 active:translate-y-px"
            >
              Agregar usuario
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nombre">
              <input
                value={fNombre}
                onChange={(e) => setFNombre(e.target.value)}
                placeholder="Ej: Ana Pérez"
                className={inputCls}
              />
            </Field>
            <Field label="Cédula">
              <input
                value={fCedula}
                onChange={(e) => setFCedula(onlyDigits(e.target.value))}
                placeholder="Empieza por…"
                inputMode="numeric"
                className={inputCls}
              />
            </Field>
            <Field label="Rol">
              <select value={fRol} onChange={(e) => setFRol(e.target.value)} className={inputCls}>
                <option>Todos</option>
                <option>Administrador</option>
                <option>Empleado</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={inputCls}>
                <option>Todos</option>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Dado de baja</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={aplicarFiltros}
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700"
            >
              Aplicar filtros
            </button>
            <button
              onClick={limpiarFiltros}
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Listado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Listado</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-600">Sin resultados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Nombre</Th>
                    <Th>Celular</Th>
                    <Th>Rol</Th>
                    <Th>Estado</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td>{u.nombre_completo}</Td>
                      <Td>{u.celular}</Td>
                      <Td>
                        <span className="rounded-full bg-sapphire-100 px-2 py-0.5 text-xs font-semibold text-sapphire-800">
                          {u.rol}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            u.estado === "activo"
                              ? "bg-green-100 text-green-800"
                              : u.estado === "inactivo"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-300 text-slate-800",
                          ].join(" ")}
                        >
                          {u.estado}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                            onClick={() => openEditFor(u)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-md border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                            onClick={() => openEstadoFor(u)}
                          >
                            Estado
                          </button>
                          <button
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => openInfoFor(u)}
                          >
                            Historial
                          </button>
                          <button
                            disabled={u.estado === "activo"}
                            className={`rounded-md px-3 py-1 text-xs font-semibold ${
                              u.estado === "dado de baja"
                                ? "border border-red-300 bg-red-100 text-red-800 hover:bg-red-200"
                                : u.estado === "inactivo"
                                ? "border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "border border-slate-300 bg-slate-100 text-slate-400"
                            }`}
                            onClick={() => deleteUser(u)}
                            title={
                              u.estado === "activo"
                                ? "Primero cambia el estado a 'inactivo' o 'dado de baja'"
                                : u.estado === "inactivo"
                                ? "Quitar de la lista (no elimina en BD)"
                                : "Eliminar permanentemente"
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: Crear */}
        {openCreate && (
          <Modal onClose={() => setOpenCreate(false)} title="Agregar usuario">
            <FormError error={error} />
            <form onSubmit={submitCreate} className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Nombre completo">
                  <input
                    name="nombre_completo"
                    value={form.nombre_completo}
                    onChange={onChangeCreate}
                    className={inputCls}
                  />
                </Field>
                <Field label="Usuario">
                  <input name="usuario" value={form.usuario} onChange={onChangeCreate} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Contraseña (1 mayúscula)">
                  <input
                    type="password"
                    name="contrasena"
                    value={form.contrasena}
                    onChange={onChangeCreate}
                    className={inputCls}
                  />
                </Field>
                <Field label="Celular (10 dígitos)">
                  <input
                    name="celular"
                    value={form.celular}
                    onChange={onChangeCreate}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Cédula (10 dígitos)">
                  <input
                    name="cedula"
                    value={form.cedula}
                    onChange={onChangeCreate}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>
                <Field label="Rol">
                  <select name="rol" value={form.rol} onChange={onChangeCreate} className={inputCls}>
                    <option value="empleado">Empleado</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenCreate(false);
                    resetCreate();
                    setError("");
                  }}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Editar (estado se cambia en su modal dedicado) */}
        {openEdit && editUser && (
          <Modal onClose={() => setOpenEdit(false)} title={`Editar: ${editUser.usuario}`}>
            <FormError error={error} />
            <form onSubmit={submitEdit} className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Nombre completo">
                  <input name="nombre_completo" value={editForm.nombre_completo} onChange={onChangeEdit} className={inputCls} />
                </Field>
                <Field label="Usuario">
                  <input name="usuario" value={editForm.usuario} onChange={onChangeEdit} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Nueva contraseña (opcional, 1 mayúscula)">
                  <input type="password" name="contrasena" value={editForm.contrasena} onChange={onChangeEdit} className={inputCls} />
                </Field>
                <Field label="Celular (10 dígitos)">
                  <input name="celular" value={editForm.celular} onChange={onChangeEdit} inputMode="numeric" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Cédula (10 dígitos)">
                  <input name="cedula" value={editForm.cedula} onChange={onChangeEdit} inputMode="numeric" className={inputCls} />
                </Field>
                <Field label="Rol">
                  <select name="rol" value={editForm.rol} onChange={onChangeEdit} className={inputCls}>
                    <option value="empleado">Empleado</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </Field>
              </div>
              <Field label="Estado (se cambia desde el botón Estado)">
                <select name="estado" value={editForm.estado} onChange={onChangeEdit} className={inputCls} disabled>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="dado de baja">Dado de baja</option>
                </select>
              </Field>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenEdit(false);
                    setEditUser(null);
                    setError("");
                  }}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Cambiar estado */}
        {openEstado && estadoUser && (
          <Modal onClose={() => setOpenEstado(false)} title={`Estado de: ${estadoUser.usuario}`}>
            <form onSubmit={submitEstado} className="grid gap-3">
              <Field label="Selecciona un estado">
                <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className={inputCls}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="dado de baja">Dado de baja</option>
                </select>
              </Field>
              <div className="text-sm text-slate-600">
                Nota: si el usuario está <b>inactivo</b> no podrá iniciar sesión.
                Si está <b>dado de baja</b>, podrás eliminarlo definitivamente.
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setOpenEstado(false)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">
                  Cancelar
                </button>
                <button type="submit" disabled={savingEstado} className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70">
                  {savingEstado ? "Actualizando..." : "Actualizar estado"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Historial */}
        {openInfo && infoUser && (
          <Modal onClose={() => setOpenInfo(false)} title={`Detalle de usuario: ${infoUser.usuario}`}>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <Info label="Nombre completo" value={infoUser.nombre_completo} />
              <Info label="Usuario" value={infoUser.usuario} />
              <Info label="Rol" value={infoUser.rol} />
              <Info label="Estado" value={infoUser.estado} />
              <Info label="Celular" value={infoUser.celular} />
              <Info label="Cédula" value={infoUser.cedula} />
              <Info label="Fecha registro" value={new Date(infoUser.fecha_registro).toLocaleString()} />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ helpers UI ------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}
function FormError({ error }) {
  if (!error) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {error}
    </div>
  );
}
function Th({ children }) {
  return <th className="px-3 py-2">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2">{children}</td>;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40";
