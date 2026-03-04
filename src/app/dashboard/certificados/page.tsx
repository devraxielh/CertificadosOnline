"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import CertificateBuilder from "@/components/CertificateBuilder"
import toast from "react-hot-toast"

interface Event { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; eventId: number; event: Event; issueDate: string; _count?: { assignments: number } }

const PARTICIPATION_TYPES = ["Ponente", "Asistente", "Evaluador"]
const DEFAULT_TEMPLATE = "";

export default function CertificadosPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [editingCert, setEditingCert] = useState<Certificate | null>(null)
    const [form, setForm] = useState({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "" })
    const [error, setError] = useState("")

    const fetchData = useCallback(async () => { const [c, e] = await Promise.all([fetch("/api/certificados"), fetch("/api/eventos")]); setCertificates(await c.json()); setEvents(await e.json()); setLoading(false) }, [])
    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingCert ? `/api/certificados/${editingCert.id}` : "/api/certificados"
        const res = await fetch(url, { method: editingCert ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingCert ? "Certificado actualizado" : "Certificado creado")
            setShowModal(false); setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "" }); fetchData()
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
    const openCreate = () => { setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: events[0]?.id?.toString() || "", issueDate: new Date().toISOString().split("T")[0] }); setError(""); setShowModal(true) }
    const openEdit = (c: Certificate) => { setEditingCert(c); setForm({ participationType: c.participationType, templateHtml: c.templateHtml, eventId: c.eventId.toString(), issueDate: new Date(c.issueDate).toISOString().split("T")[0] }); setError(""); setShowModal(true) }
    const openPreview = (c: Certificate) => { setPreviewHtml(c.templateHtml.replace(/\{\{NOMBRE_COMPLETO\}\}/g, "Juan Pérez").replace(/\{\{IDENTIFICACION\}\}/g, "1234567890").replace(/\{\{TIPO_PARTICIPACION\}\}/g, c.participationType).replace(/\{\{NOMBRE_EVENTO\}\}/g, c.event?.name || "").replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(c.issueDate).toLocaleDateString("es-CO"))); setShowPreview(true) }



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

                            <div className="col-span-full mt-6">
                                <CertificateBuilder
                                    initialHtml={form.templateHtml}
                                    onChange={(html) => setForm({ ...form, templateHtml: html })}
                                />
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
                        <div className="flex justify-center mt-4 bg-gray-50 p-6 rounded-xl border border-gray-200 overflow-auto">
                            <div
                                style={{ transform: "scale(0.8)", transformOrigin: "top center", width: '800px', height: '600px' }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                className="shadow-theme-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
