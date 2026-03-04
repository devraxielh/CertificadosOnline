"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import dynamic from 'next/dynamic'
import toast from "react-hot-toast"
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface Event { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; eventId: number; event: Event; issueDate: string; _count?: { assignments: number } }
const PARTICIPATION_TYPES = ["Ponente", "Asistente", "Evaluador"]
const DEFAULT_TEMPLATE = `
  <div style="padding:40px;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-family:Georgia,serif;">
    <h1 style="color:#465fff;font-size:36px;margin-bottom:10px;">CERTIFICADO</h1>
    <p style="color:#667085;font-size:14px;letter-spacing:2px;margin-bottom:30px;">DE PARTICIPACIÓN</p>
    <p style="color:#344054;font-size:16px;margin-bottom:5px;">Se otorga el presente certificado a:</p>
    <h2 style="color:#101828;font-size:28px;border-bottom:2px solid #7592ff;padding-bottom:10px;margin:15px 0;">{{NOMBRE_COMPLETO}}</h2>
    <p style="color:#344054;font-size:16px;margin-bottom:5px;">Identificación: {{IDENTIFICACION}}</p>
    <p style="color:#344054;font-size:16px;margin:15px 0;">Por su participación como <strong>{{TIPO_PARTICIPACION}}</strong></p>
    <p style="color:#344054;font-size:16px;">en el evento:</p>
    <h3 style="color:#465fff;font-size:22px;margin:10px 0;">{{NOMBRE_EVENTO}}</h3>
    <p style="color:#667085;font-size:14px;margin-top:20px;">Fecha de expedición: {{FECHA_EXPEDICION}}</p>
  </div>
`

export default function CertificadosPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [editingCert, setEditingCert] = useState<Certificate | null>(null)
    const [form, setForm] = useState({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "", bgImage: "linear-gradient(135deg,#f9fafb,#ecf3ff)" })
    const [error, setError] = useState("")

    const modules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['clean']
        ],
    }), []);

    const fetchData = useCallback(async () => { const [c, e] = await Promise.all([fetch("/api/certificados"), fetch("/api/eventos")]); setCertificates(await c.json()); setEvents(await e.json()); setLoading(false) }, [])
    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingCert ? `/api/certificados/${editingCert.id}` : "/api/certificados"
        const res = await fetch(url, { method: editingCert ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingCert ? "Certificado actualizado" : "Certificado creado")
            setShowModal(false); setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "", bgImage: "linear-gradient(135deg,#f9fafb,#ecf3ff)" }); fetchData()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar el certificado"
            toast.error(err)
            setError(err)
        }
    }
    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar?")) return;
        const res = await fetch(`/api/certificados/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Certificado eliminado")
            fetchData()
        } else {
            toast.error("Error al eliminar el certificado")
        }
    }
    const openCreate = () => { setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: events[0]?.id?.toString() || "", issueDate: new Date().toISOString().split("T")[0], bgImage: "linear-gradient(135deg,#f9fafb,#ecf3ff)" }); setError(""); setShowModal(true) }
    const openEdit = (c: Certificate) => { setEditingCert(c); setForm({ participationType: c.participationType, templateHtml: c.templateHtml, eventId: c.eventId.toString(), issueDate: new Date(c.issueDate).toISOString().split("T")[0], bgImage: "linear-gradient(135deg,#f9fafb,#ecf3ff)" }); setError(""); setShowModal(true) }
    const openPreview = (c: Certificate) => { setPreviewHtml(c.templateHtml.replace(/\{\{NOMBRE_COMPLETO\}\}/g, "Juan Pérez").replace(/\{\{IDENTIFICACION\}\}/g, "1234567890").replace(/\{\{TIPO_PARTICIPACION\}\}/g, c.participationType).replace(/\{\{NOMBRE_EVENTO\}\}/g, c.event?.name || "").replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(c.issueDate).toLocaleDateString("es-CO"))); setShowPreview(true) }

    const livePreviewHtml = form.templateHtml
        .replace(/\{\{NOMBRE_COMPLETO\}\}/g, "Juan Pérez")
        .replace(/\{\{IDENTIFICACION\}\}/g, "1234567890")
        .replace(/\{\{TIPO_PARTICIPACION\}\}/g, form.participationType)
        .replace(/\{\{NOMBRE_EVENTO\}\}/g, events.find(e => e.id.toString() === form.eventId)?.name || "Nombre del Evento")
        .replace(/\{\{FECHA_EXPEDICION\}\}/g, form.issueDate ? new Date(form.issueDate).toLocaleDateString("es-CO") : "DD/MM/YYYY")

    const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tId = toast.loading("Subiendo imagen...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                toast.success("Imagen de fondo aplicada", { id: tId });
                setForm({ ...form, bgImage: `url('${data.url}')` });
            } else {
                toast.error(data.error || "Error al subir", { id: tId });
            }
        } catch {
            toast.error("Error de red", { id: tId });
        }
        e.target.value = "";
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
    const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"
    const pb: Record<string, string> = { Ponente: "bg-warning-50 text-warning-600", Evaluador: "bg-success-50 text-success-600", Asistente: "bg-brand-50 text-brand-600" }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Certificados</h2><p className="text-gray-500 text-sm mt-1">Gestión de certificados y plantillas</p></div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">+ Nuevo Certificado</button>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs"><div className="overflow-x-auto"><table className="w-full">
                    <thead><tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Evento</th>
                        <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Participación</th>
                        <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Fecha Exp.</th>
                        <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Asig.</th>
                        <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {certificates.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.event?.name}</td>
                                <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pb[c.participationType] || "bg-gray-100 text-gray-600"}`}>{c.participationType}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(c.issueDate)}</td>
                                <td className="px-6 py-4"><span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{c._count?.assignments || 0}</span></td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => openPreview(c)} className="inline-flex rounded-lg border border-success-100 bg-success-50 px-3 py-1.5 text-xs font-medium text-success-600 hover:bg-success-100 transition-colors">Vista previa</button>
                                    <button onClick={() => openEdit(c)} className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Editar</button>
                                    <button onClick={() => handleDelete(c.id)} className="inline-flex rounded-lg border border-error-100 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-100 transition-colors">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {certificates.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No hay certificados</td></tr>}
                    </tbody>
                </table></div></div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-[90rem] rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingCert ? "Editar" : "Nuevo"} Certificado</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Participación</label><select value={form.participationType} onChange={e => setForm({ ...form, participationType: e.target.value })} className={ic}>{PARTICIPATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Evento</label><select value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} required className={ic}><option value="">Seleccione</option>{events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fecha expedición</label><input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} required className={ic} /></div>
                            </div>

                            <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                                {/* Left Side: Editor */}
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                                        <span>Plantilla Visual <span className="text-gray-400 font-normal ml-1">({`{{NOMBRE_COMPLETO}}, {{IDENTIFICACION}}, {{NOMBRE_EVENTO}}...`})</span></span>
                                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors border border-brand-200">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Subir Fondo
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUploadBackground} />
                                        </label>
                                    </label>
                                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-theme-xs bg-white h-[440px] flex flex-col">
                                        <ReactQuill theme="snow" value={form.templateHtml} onChange={(val) => setForm({ ...form, templateHtml: val })} modules={modules} className="h-full flex-1 flex flex-col [&_.ql-container]:flex-1 [&_.ql-container]:overflow-hidden [&_.ql-editor]:h-full [&_.ql-editor]:overflow-y-auto" />
                                    </div>
                                    <p className="text-xs text-brand-500 font-medium">Usa dobles llaves para insertar variables dinámicas que se completarán automáticamente con los datos de las personas asignadas.</p>
                                </div>

                                {/* Right Side: Live Preview */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Vista Previa en Tiempo Real</label>
                                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-center overflow-hidden h-[480px]">
                                        <div style={{ width: "800px", height: "600px", transform: "scale(0.65)", transformOrigin: "center", border: "1px solid #e5e7eb", background: `${form.bgImage} center/cover no-repeat`, backgroundSize: "cover" }} className="ql-snow">
                                            <div className="ql-editor" dangerouslySetInnerHTML={{ __html: livePreviewHtml }} style={{ width: "100%", height: "100%", padding: 0 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Guardar Certificado</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showPreview && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">Vista Previa</h3>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
                        </div>
                        <div className="flex justify-center">
                            <div style={{ width: "800px", height: "600px", background: `${form.bgImage} center/cover no-repeat`, backgroundSize: "cover", border: "1px solid #e5e7eb" }} className="ql-snow">
                                <div className="ql-editor" dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ width: "100%", height: "100%", padding: 0 }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
