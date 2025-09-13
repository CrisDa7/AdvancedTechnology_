import { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ServicesPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "", usuario: "", contrasena: "",
    ciudad: "", telefono: "", cedula: "", direccion: "",
    tipo_equipo: "", modelo: "",
    descripcion_equipo: "", proceso: "",
    valor_total: "", pago_tipo: "abono", monto_abono: "0",
    observaciones: ""
  });

  // Detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null); // servicio completo
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Editar
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [edit, setEdit] = useState({
    id: null,
    ciudad: "", telefono: "", cedula: "", direccion: "",
    tipo_equipo: "", modelo: "",
    descripcion_equipo: "", proceso: "",
    valor_total: "", pago_tipo: "abono", monto_abono: "",
    observaciones: ""
  });

  // Estado
  const [estadoOpen, setEstadoOpen] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("pendiente");
  const [estadoSaving, setEstadoSaving] = useState(false);
  const estados = ["pendiente", "en proceso", "terminado", "entregado"];

  // Comentario
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [comentario, setComentario] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  // ====== Validaciones ======
  const rules = useMemo(() => ({
    nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/,
    solo10: /^\d{10}$/,
    mayus: /[A-Z]/,
    dinero: (v) => /^(\d+)(\.\d{1,2})?$/.test(v),
  }), []);

  const validateCreate = () => {
    const e = {};
    if (!rules.nombre.test(form.nombre_completo)) e.nombre_completo = "Nombre: solo letras y espacios";
    if (!form.usuario.trim()) e.usuario = "Usuario obligatorio";
    if (!rules.mayus.test(form.contrasena)) e.contrasena = "Contraseña con 1 mayúscula";
    if (!rules.nombre.test(form.ciudad)) e.ciudad = "Ciudad: solo letras y espacios";
    if (!rules.solo10.test(form.telefono)) e.telefono = "Teléfono: 10 dígitos";
    if (!rules.solo10.test(form.cedula)) e.cedula = "Cédula: 10 dígitos";
    if (!form.direccion.trim()) e.direccion = "Dirección obligatoria";
    if (!form.tipo_equipo.trim()) e.tipo_equipo = "Tipo de equipo obligatorio";
    if (!form.modelo.trim()) e.modelo = "Modelo obligatorio";
    if (!form.descripcion_equipo.trim()) e.descripcion_equipo = "Descripción obligatoria";
    if (!form.proceso.trim()) e.proceso = "Proceso obligatorio";
    if (!rules.dinero(form.valor_total)) e.valor_total = "Total inválido";
    if (form.pago_tipo === "abono" && !rules.dinero(form.monto_abono)) e.monto_abono = "Abono inválido";
    if (form.pago_tipo === "abono" && parseFloat(form.monto_abono) > parseFloat(form.valor_total)) e.monto_abono = "Abono > Total";
    return e;
  };

  const validateEdit = () => {
    const e = {};
    if (!rules.nombre.test(edit.ciudad)) e.ciudad = "Ciudad: solo letras y espacios";
    if (!rules.solo10.test(edit.telefono)) e.telefono = "Teléfono: 10 dígitos";
    if (!rules.solo10.test(edit.cedula)) e.cedula = "Cédula: 10 dígitos";
    if (!edit.direccion.trim()) e.direccion = "Dirección obligatoria";
    if (!edit.tipo_equipo.trim()) e.tipo_equipo = "Tipo de equipo obligatorio";
    if (!edit.modelo.trim()) e.modelo = "Modelo obligatorio";
    if (!edit.descripcion_equipo.trim()) e.descripcion_equipo = "Descripción obligatoria";
    if (!edit.proceso.trim()) e.proceso = "Proceso obligatorio";
    if (!rules.dinero(edit.valor_total)) e.valor_total = "Total inválido";
    if (edit.pago_tipo === "abono" && !rules.dinero(edit.monto_abono)) e.monto_abono = "Abono inválido";
    if (edit.pago_tipo === "abono" && parseFloat(edit.monto_abono || "0") > parseFloat(edit.valor_total || "0")) e.monto_abono = "Abono > Total";
    return e;
  };

  // ====== Data ======
  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/servicios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener servicios");
      setItems(data);
    } catch (err) {
      setError(err.message || "Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (token) fetchItems(); }, [token]);

  // ====== Create ======
  const onChangeCreate = (e) => {
    const { name, value } = e.target;
    if (name === "telefono" || name === "cedula") {
      return setForm(f => ({ ...f, [name]: value.replace(/\D/g, "").slice(0, 10) }));
    }
    setForm(f => ({ ...f, [name]: value }));
  };
  const resetCreate = () => setForm({
    nombre_completo: "", usuario: "", contrasena: "",
    ciudad: "", telefono: "", cedula: "", direccion: "",
    tipo_equipo: "", modelo: "",
    descripcion_equipo: "", proceso: "",
    valor_total: "", pago_tipo: "abono", monto_abono: "0",
    observaciones: ""
  });

  const restanteCreatePreview = (() => {
    const t = parseFloat(form.valor_total || "0");
    const ab = form.pago_tipo === "abono" ? parseFloat(form.monto_abono || "0") : t;
    const r = t - ab;
    return isNaN(r) ? "" : r.toFixed(2);
  })();

  const submitCreate = async (e) => {
    e.preventDefault();
    const errs = validateCreate();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);
    try {
      setSubmitting(true);
      setError("");
      const payload = {
        ...form,
        valor_total: Number(form.valor_total),
        monto_abono: form.pago_tipo === "abono" ? Number(form.monto_abono || 0) : undefined
      };
      const res = await fetch(`${API}/api/servicios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al crear servicio");
      setItems(list => [body, ...list]);
      resetCreate();
      setOpenCreate(false);
    } catch (err) {
      setError(err.message || "Error al crear servicio");
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Detail ======
  const openDetailFor = async (id) => {
    try {
      setDetailOpen(true);
      setLoadingDetail(true);
      const res = await fetch(`${API}/api/servicios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo obtener el servicio");
      setDetail(data);
    } catch (e) {
      // Fallback: si falla, intenta mostrar de la lista
      const fallback = items.find(x => x.id === id) || null;
      setDetail(fallback);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ====== Edit ======
  const openEditFor = (s) => {
    setEdit({
      id: s.id,
      ciudad: s.ciudad || "",
      telefono: String(s.telefono || "").slice(0, 10),
      cedula: String(s.cedula || "").slice(0, 10),
      direccion: s.direccion || "",
      tipo_equipo: s.tipo_equipo || "",
      modelo: s.modelo || "",
      descripcion_equipo: s.descripcion_equipo || "",
      proceso: s.proceso || "",
      valor_total: String(s.valor_total ?? ""),
      pago_tipo: s.pago_tipo || "abono",
      monto_abono: s.pago_tipo === "abono" ? String(s.monto_abono ?? "0") : "",
      observaciones: s.observaciones || "",
    });
    setEditOpen(true);
  };
  const onChangeEdit = (e) => {
    const { name, value } = e.target;
    if (name === "telefono" || name === "cedula") {
      return setEdit(f => ({ ...f, [name]: value.replace(/\D/g, "").slice(0, 10) }));
    }
    setEdit(f => ({ ...f, [name]: value }));
  };
  const restanteEditPreview = (() => {
    const t = parseFloat(edit.valor_total || "0");
    const ab = edit.pago_tipo === "abono" ? parseFloat(edit.monto_abono || "0") : t;
    const r = t - ab;
    return isNaN(r) ? "" : r.toFixed(2);
  })();

  const submitEdit = async (e) => {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length) return setError(Object.values(errs)[0]);

    try {
      setEditSaving(true);
      setError("");
      const payload = {
        ciudad: edit.ciudad,
        telefono: edit.telefono,
        cedula: edit.cedula,
        direccion: edit.direccion,
        tipo_equipo: edit.tipo_equipo,
        modelo: edit.modelo,
        descripcion_equipo: edit.descripcion_equipo,
        proceso: edit.proceso,
        valor_total: Number(edit.valor_total),
        pago_tipo: edit.pago_tipo,
        monto_abono: edit.pago_tipo === "abono" ? Number(edit.monto_abono || 0) : undefined,
        observaciones: edit.observaciones || null,
      };
      const res = await fetch(`${API}/api/servicios/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al actualizar servicio");

      setItems(list => list.map(x => x.id === body.id ? body : x));
      setEditOpen(false);
    } catch (err) {
      setError(err.message || "Error al actualizar servicio");
    } finally {
      setEditSaving(false);
    }
  };

  // ====== Estado ======
  const openEstadoFor = (s) => {
    setEstadoTarget(s);
    setNuevoEstado(s.estado || "pendiente");
    setEstadoOpen(true);
  };
  const submitEstado = async (e) => {
    e.preventDefault();
    if (!estadoTarget) return;
    try {
      setEstadoSaving(true);
      setError("");
      const res = await fetch(`${API}/api/servicios/${estadoTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "No se pudo actualizar el estado");
      setItems(list => list.map(x => x.id === body.id ? body : x));
      setEstadoOpen(false);
      setEstadoTarget(null);
    } catch (err) {
      setError(err.message || "Error actualizando estado");
    } finally {
      setEstadoSaving(false);
    }
  };

  // ====== Comentario ======
  const openCommentFor = (s) => {
    setCommentTarget(s);
    setComentario("");
    setCommentOpen(true);
  };
  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentTarget) return;
    try {
      setCommentSaving(true);
      setError("");
      const res = await fetch(`${API}/api/servicios/${commentTarget.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: comentario }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "No se pudo enviar el comentario");
      // Si el backend devuelve el servicio actualizado (ej. ultimo_comentario), actualizamos:
      if (body?.servicio) {
        setItems(list => list.map(x => x.id === body.servicio.id ? body.servicio : x));
      }
      setCommentOpen(false);
      setCommentTarget(null);
    } catch (err) {
      setError(err.message || "Error enviando comentario");
    } finally {
      setCommentSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
          Necesitas iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sapphire-50">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h1 className="m-0 text-2xl font-bold text-sapphire-900">Servicios</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchItems}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Refrescar
            </button>
            <button
              className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 active:translate-y-px"
              onClick={() => { setError(""); setOpenCreate(true); }}
            >
              Agregar servicio
            </button>
          </div>
        </div>

        {/* Listado (solo columnas pedidas) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-glass">
          <h3 className="mb-3 text-base font-semibold text-sapphire-900">Listado</h3>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">No hay servicios.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <Th>Cliente</Th>
                    <Th>Total</Th>
                    <Th>Abono</Th>
                    <Th>Restante</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <Td className="font-medium">{s.nombre_completo}</Td>
                      <Td>${Number(s.valor_total).toFixed(2)}</Td>
                      <Td>${Number(s.monto_abono || 0).toFixed(2)}</Td>
                      <Td>${Number(s.valor_restante ?? (Number(s.valor_total) - Number(s.monto_abono || 0))).toFixed(2)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openDetailFor(s.id)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            Ver detalles
                          </button>
                          <button
                            onClick={() => openEditFor(s)}
                            className="rounded-md border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openEstadoFor(s)}
                            className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                          >
                            Estado
                          </button>
                          <button
                            onClick={() => openCommentFor(s)}
                            className="rounded-md border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-green-200"
                          >
                            Comentario
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

        {/* MODAL: Crear servicio */}
        {openCreate && (
          <Modal onClose={() => setOpenCreate(false)} title="Agregar servicio" wide>
            <FormError error={error} />
            <form onSubmit={submitCreate} className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Nombre completo">
                  <input name="nombre_completo" value={form.nombre_completo} onChange={onChangeCreate} className={inputCls} />
                </Field>
                <Field label="Usuario">
                  <input name="usuario" value={form.usuario} onChange={onChangeCreate} className={inputCls} />
                </Field>
                <Field label="Contraseña (1 mayúscula)">
                  <input type="password" name="contrasena" value={form.contrasena} onChange={onChangeCreate} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Ciudad">
                  <input name="ciudad" value={form.ciudad} onChange={onChangeCreate} className={inputCls} />
                </Field>
                <Field label="Teléfono (10 dígitos)">
                  <input name="telefono" value={form.telefono} onChange={onChangeCreate} className={inputCls} />
                </Field>
                <Field label="Cédula (10 dígitos)">
                  <input name="cedula" value={form.cedula} onChange={onChangeCreate} className={inputCls} />
                </Field>
              </div>

              <Field label="Dirección">
                <input name="direccion" value={form.direccion} onChange={onChangeCreate} className={inputCls} />
              </Field>

              <Field label="Observaciones (opcional)">
                <textarea name="observaciones" value={form.observaciones} onChange={onChangeCreate} className={`${inputCls} min-h-[60px]`} />
              </Field>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Tipo de equipo">
                  <input name="tipo_equipo" value={form.tipo_equipo} onChange={onChangeCreate} className={inputCls} />
                </Field>
                <Field label="Modelo">
                  <input name="modelo" value={form.modelo} onChange={onChangeCreate} className={inputCls} />
                </Field>
              </div>

              <Field label="Descripción de equipo">
                <textarea name="descripcion_equipo" value={form.descripcion_equipo} onChange={onChangeCreate} className={`${inputCls} min-h-[80px]`} />
              </Field>

              <Field label="Proceso">
                <textarea name="proceso" value={form.proceso} onChange={onChangeCreate} className={`${inputCls} min-h-[80px]`} />
              </Field>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Valor total">
                  <input name="valor_total" inputMode="decimal" value={form.valor_total} onChange={onChangeCreate} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label="Pago">
                  <select name="pago_tipo" value={form.pago_tipo} onChange={onChangeCreate} className={inputCls}>
                    <option value="abono">Abono</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </Field>
                {form.pago_tipo === "abono" && (
                  <Field label="Monto abono">
                    <input name="monto_abono" inputMode="decimal" value={form.monto_abono} onChange={onChangeCreate} className={inputCls} placeholder="0.00" />
                  </Field>
                )}
              </div>

              <div className="text-sm text-slate-700">
                Restante (previo): <b>${restanteCreatePreview}</b>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setOpenCreate(false); resetCreate(); setError(""); }}
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

        {/* MODAL: Ver detalles */}
        {detailOpen && (
          <Modal onClose={() => { setDetailOpen(false); setDetail(null); }} title="Detalle de servicio" wide>
            {loadingDetail ? (
              <p className="text-slate-600">Cargando...</p>
            ) : !detail ? (
              <p className="text-slate-600">No se pudo obtener el servicio.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <Info label="Código" value={detail.codigo} />
                <Info label="Fecha recepción" value={new Date(detail.fecha_recepcion).toLocaleString()} />
                <Info label="Cliente" value={detail.nombre_completo} />
                <Info label="Cédula" value={detail.cedula} />
                <Info label="Teléfono" value={detail.telefono} />
                <Info label="Ciudad" value={detail.ciudad} />
                <Info label="Dirección" value={detail.direccion} />
                <Info label="Equipo" value={detail.tipo_equipo} />
                <Info label="Modelo" value={detail.modelo} />
                <Info label="Estado" value={detail.estado} />
                <Info label="Pago" value={detail.pago_tipo} />
                <Info label="Total" value={`$${Number(detail.valor_total).toFixed(2)}`} />
                <Info label="Abono" value={`$${Number(detail.monto_abono || 0).toFixed(2)}`} />
                <Info label="Restante" value={`$${Number(detail.valor_restante ?? (Number(detail.valor_total) - Number(detail.monto_abono || 0))).toFixed(2)}`} />
                <Info label="Descripción de equipo" value={detail.descripcion_equipo} />
                <Info label="Proceso" value={detail.proceso} />
                <Info label="Observaciones" value={detail.observaciones} />
              </div>
            )}
          </Modal>
        )}

        {/* MODAL: Editar */}
        {editOpen && (
          <Modal onClose={() => setEditOpen(false)} title="Editar servicio" wide>
            <FormError error={error} />
            <form onSubmit={submitEdit} className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Ciudad">
                  <input name="ciudad" value={edit.ciudad} onChange={onChangeEdit} className={inputCls} />
                </Field>
                <Field label="Teléfono (10 dígitos)">
                  <input name="telefono" value={edit.telefono} onChange={onChangeEdit} className={inputCls} />
                </Field>
                <Field label="Cédula (10 dígitos)">
                  <input name="cedula" value={edit.cedula} onChange={onChangeEdit} className={inputCls} />
                </Field>
              </div>

              <Field label="Dirección">
                <input name="direccion" value={edit.direccion} onChange={onChangeEdit} className={inputCls} />
              </Field>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Tipo de equipo">
                  <input name="tipo_equipo" value={edit.tipo_equipo} onChange={onChangeEdit} className={inputCls} />
                </Field>
                <Field label="Modelo">
                  <input name="modelo" value={edit.modelo} onChange={onChangeEdit} className={inputCls} />
                </Field>
              </div>

              <Field label="Descripción de equipo">
                <textarea name="descripcion_equipo" value={edit.descripcion_equipo} onChange={onChangeEdit} className={`${inputCls} min-h-[80px]`} />
              </Field>

              <Field label="Proceso">
                <textarea name="proceso" value={edit.proceso} onChange={onChangeEdit} className={`${inputCls} min-h-[80px]`} />
              </Field>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Valor total">
                  <input name="valor_total" inputMode="decimal" value={edit.valor_total} onChange={onChangeEdit} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label="Pago">
                  <select name="pago_tipo" value={edit.pago_tipo} onChange={onChangeEdit} className={inputCls}>
                    <option value="abono">Abono</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </Field>
                {edit.pago_tipo === "abono" && (
                  <Field label="Monto abono">
                    <input name="monto_abono" inputMode="decimal" value={edit.monto_abono} onChange={onChangeEdit} className={inputCls} placeholder="0.00" />
                  </Field>
                )}
              </div>

              <div className="text-sm text-slate-700">
                Restante (previo): <b>${restanteEditPreview}</b>
              </div>

              <Field label="Observaciones (opcional)">
                <textarea name="observaciones" value={edit.observaciones} onChange={onChangeEdit} className={`${inputCls} min-h-[60px]`} />
              </Field>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70"
                >
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Cambiar estado */}
        {estadoOpen && estadoTarget && (
          <Modal onClose={() => setEstadoOpen(false)} title={`Estado de: ${estadoTarget.nombre_completo}`}>
            <form onSubmit={submitEstado} className="grid gap-3">
              <Field label="Selecciona un estado">
                <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className={inputCls}>
                  {estados.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
              <div className="text-sm text-slate-600">
                Este estado será visible en el seguimiento del servicio.
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEstadoOpen(false)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={estadoSaving} className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70">
                  {estadoSaving ? "Actualizando..." : "Actualizar estado"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Comentario al cliente */}
        {commentOpen && commentTarget && (
          <Modal onClose={() => setCommentOpen(false)} title={`Mensaje para: ${commentTarget.nombre_completo}`}>
            <form onSubmit={submitComment} className="grid gap-3">
              <Field label="Comentario / Mensaje">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className={`${inputCls} min-h-[100px]`}
                  placeholder="Ej: Su equipo ya está listo para entrega."
                />
              </Field>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setCommentOpen(false)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={commentSaving} className="rounded-lg bg-sapphire-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire-700 disabled:opacity-70">
                  {commentSaving ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className={`w-full ${wide ? "max-w-5xl" : "max-w-3xl"} rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50">✕</button>
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
      <div className="font-medium text-slate-900">{value ?? "—"}</div>
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
function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sapphire-400 focus:ring-2 focus:ring-sapphire-400/40";
