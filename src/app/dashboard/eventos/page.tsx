"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import ConfirmModal from "@/components/ConfirmModal"
import toast from "react-hot-toast"

interface Event { id: number; name: string; startDate: string; endDate: string; description: string; eventType: string; status: string }
const EVENT_STATUSES = ["Pendiente", "Realizado"]
const EVENT_TYPES = ["Diplomado", "Foro", "Charla", "Conversatorio", "Simposio", "Congreso", "Capacitación", "Curso", "Ponencia", "Taller"]

export default function EventosPage() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingEvent, setEditingEvent] = useState<Event | null>(null)
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: "Realizado" })
    const [activeTab, setActiveTab] = useState("Pendiente")
    const [error, setError] = useState("")
    const [searchName, setSearchName] = useState("")
    const [filterFrom, setFilterFrom] = useState("")
    const [filterTo, setFilterTo] = useState("")
    const [filterType, setFilterType] = useState("")
    const [page, setPage] = useState(1)
    const PER_PAGE = 15
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "status"; event: Event } | null>(null)

    const fetchEvents = useCallback(async () => { const res = await fetch("/api/eventos"); setEvents(await res.json()); setLoading(false) }, [])
    useEffect(() => { fetchEvents() }, [fetchEvents])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingEvent ? `/api/eventos/${editingEvent.id}` : "/api/eventos"
        const res = await fetch(url, { method: editingEvent ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingEvent ? "Evento actualizado" : "Evento creado")
            setShowModal(false); setEditingEvent(null); setForm({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: "Realizado" }); fetchEvents()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar el evento"
            toast.error(err)
            setError(err)
        }
    }
    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/eventos/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Evento eliminado")
            fetchEvents()
        } else {
            toast.error("Error al eliminar el evento")
        }
    }
    const toggleStatus = async (ev: Event) => {
        const newStatus = (ev.status || "Realizado") === "Realizado" ? "Pendiente" : "Realizado";
        const res = await fetch(`/api/eventos/${ev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: ev.name, startDate: new Date(ev.startDate).toISOString().split("T")[0], endDate: new Date(ev.endDate).toISOString().split("T")[0], description: ev.description || "", eventType: ev.eventType, status: newStatus }) });
        if (res.ok) {
            toast.success(`Estado del evento: ${newStatus}`)
            fetchEvents()
        } else {
            toast.error("Error al cambiar el estado")
        }
    }
    const askDelete = (ev: Event) => setConfirmAction({ type: "delete", event: ev })
    const askToggle = (ev: Event) => setConfirmAction({ type: "status", event: ev })
    const handleConfirm = () => { if (!confirmAction) return; if (confirmAction.type === "delete") handleDelete(confirmAction.event.id); else toggleStatus(confirmAction.event); setConfirmAction(null) }
    const openCreate = () => { setEditingEvent(null); setForm({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: activeTab }); setError(""); setShowModal(true) }
    const openEdit = (ev: Event) => { setEditingEvent(ev); setForm({ name: ev.name, startDate: new Date(ev.startDate).toISOString().split("T")[0], endDate: new Date(ev.endDate).toISOString().split("T")[0], description: ev.description || "", eventType: ev.eventType, status: ev.status || "Realizado" }); setError(""); setShowModal(true) }
    const formatDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
    const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"
    const tb: Record<string, string> = { Diplomado: "bg-blue-50 text-blue-700", Foro: "bg-purple-50 text-purple-700", Charla: "bg-green-50 text-green-700", Conversatorio: "bg-amber-50 text-amber-700", Simposio: "bg-pink-50 text-pink-700", Congreso: "bg-red-50 text-red-700", "Capacitación": "bg-cyan-50 text-cyan-700", Curso: "bg-indigo-50 text-indigo-700", Ponencia: "bg-orange-50 text-orange-700", Taller: "bg-teal-50 text-teal-700" }

    const now = Date.now()
    const filtered = events
        .filter((ev) => {
            if ((ev.status || "Realizado") !== activeTab) return false
            if (searchName && !ev.name.toLowerCase().includes(searchName.toLowerCase())) return false
            if (filterFrom && new Date(ev.startDate) < new Date(filterFrom)) return false
            if (filterTo && new Date(ev.endDate) > new Date(filterTo + "T23:59:59")) return false
            if (filterType && ev.eventType !== filterType) return false
            return true
        })
        .sort((a, b) => Math.abs(new Date(a.startDate).getTime() - now) - Math.abs(new Date(b.startDate).getTime() - now))
    const countByStatus = (s: string) => events.filter(ev => (ev.status || "Realizado") === s).length
    const hasFilters = searchName || filterFrom || filterTo || filterType
    const clearFilters = () => { setSearchName(""); setFilterFrom(""); setFilterTo(""); setFilterType(""); setPage(1) }
    const totalPages = Math.ceil(filtered.length / PER_PAGE)
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ["nombre", "fecha_inicio", "fecha_fin", "descripcion", "tipo_evento"],
            ["Diplomado en IA", "2025-06-01", "2025-06-15", "Diplomado sobre inteligencia artificial", "Diplomado"],
            ["Foro de Innovación", "2025-07-10", "2025-07-10", "Foro sobre innovación tecnológica", "Foro"],
        ])
        ws["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 16 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Eventos")
        XLSX.writeFile(wb, "plantilla_eventos.xlsx")
    }

    const handleFileUpload = (file: File) => {
        setImportData([])
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const wb = XLSX.read(data, { type: "array" })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const rows: any[] = XLSX.utils.sheet_to_json(ws)
                if (rows.length === 0) { toast.error("El archivo está vacío"); return }
                const required = ["nombre", "fecha_inicio", "fecha_fin", "descripcion", "tipo_evento"]
                const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
                const missing = required.filter(r => !headers.includes(r))
                if (missing.length > 0) { toast.error(`Columnas faltantes: ${missing.join(", ")}`); return }
                setImportData(rows)
            } catch { toast.error("Error al leer el archivo") }
        }
        reader.readAsArrayBuffer(file)
    }

    const handleImport = async () => {
        setImporting(true)
        let ok = 0, fail = 0
        for (const row of importData) {
            const body = {
                name: row.nombre || row.Nombre || "",
                startDate: String(row.fecha_inicio || row.Fecha_inicio || ""),
                endDate: String(row.fecha_fin || row.Fecha_fin || ""),
                description: row.descripcion || row.Descripcion || "",
                eventType: row.tipo_evento || row.Tipo_evento || "Diplomado",
            }
            if (!body.name || !body.startDate || !body.endDate) { fail++; continue }
            const res = await fetch("/api/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            if (res.ok) ok++; else fail++
        }
        setImporting(false)
        if (fail > 0 && ok > 0) toast.success(`Importación parcial: ${ok} creados, ${fail} fallaron.`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`Error al importar. (${fail} fallaron).`)
        else toast.success(`¡Importación exitosa! ${ok} eventos creados.`)

        setImportData([])
        fetchEvents()
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportEvents = () => {
        const data = events.map(ev => ({
            nombre: ev.name,
            tipo_evento: ev.eventType,
            estado: ev.status || "Realizado",
            fecha_inicio: new Date(ev.startDate).toISOString().split("T")[0],
            fecha_fin: new Date(ev.endDate).toISOString().split("T")[0],
            descripcion: ev.description,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 45 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Eventos")
        XLSX.writeFile(wb, `eventos_todos_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Eventos</h2><p className="text-gray-500 text-sm mt-1">Gestión de eventos académicos</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={exportEvents} disabled={events.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={() => { setImportData([]); setShowImportModal(true) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">+ Nuevo Evento</button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Buscar por nombre del evento..." className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs">
                            <option value="">Todos los tipos</option>
                            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                        </div>
                        {hasFilters && (
                            <button onClick={clearFilters} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 shadow-theme-xs transition-colors whitespace-nowrap">Limpiar</button>
                        )}
                    </div>
                </div>
                {hasFilters && <p className="text-xs text-gray-400 mt-3">{filtered.length} evento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {EVENT_STATUSES.map(s => (
                    <button key={s} onClick={() => { setActiveTab(s); setPage(1) }} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === s ? "bg-white text-gray-900 shadow-theme-xs" : "text-gray-500 hover:text-gray-700"}`}>
                        {s} <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${activeTab === s ? "bg-brand-50 text-brand-600" : "bg-gray-200 text-gray-500"}`}>{countByStatus(s)}</span>
                    </button>
                ))}
            </div>

            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginated.map((ev) => (
                        <div key={ev.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs hover:shadow-theme-sm transition-shadow group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tb[ev.eventType] || "bg-gray-100 text-gray-600"}`}>{ev.eventType}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(ev)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg transition-colors">✏️</button>
                                    <button onClick={() => askDelete(ev)} className="p-1.5 text-gray-400 hover:text-error-500 rounded-lg transition-colors">🗑️</button>
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-800 mb-1.5">{ev.name}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{ev.description}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-400 font-medium">📅 {formatDate(ev.startDate)} — {formatDate(ev.endDate)}</span>
                                <button onClick={() => askToggle(ev)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${(ev.status || "Realizado") === "Realizado" ? "bg-success-50 text-success-600 hover:bg-success-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${(ev.status || "Realizado") === "Realizado" ? "bg-success-500" : "bg-gray-400"}`}></span>
                                    {ev.status || "Realizado"}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 text-sm">{hasFilters ? "No se encontraron eventos con los filtros aplicados" : "No hay eventos registrados"}</div>}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-theme-xs">
                    <p className="text-sm text-gray-500">Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
                        <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingEvent ? "Editar Evento" : "Nuevo Evento"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={ic} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label><select value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })} className={ic}>{EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Estado</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={ic}>{EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Inicio</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className={ic} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fin</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className={ic} /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${ic} resize-none`} /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Eventos desde Excel</h3>

                        {/* Template download */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Descarga la plantilla con el formato correcto para importar eventos.</p>
                            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Descargar Plantilla
                            </button>
                        </div>

                        {/* File upload */}
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors cursor-pointer mb-5"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-brand-400", "bg-brand-25") }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25") }}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25"); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                        >
                            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-sm text-gray-500 mb-1">Arrastra tu archivo Excel aquí o <span className="text-brand-500 font-medium">haz clic para seleccionar</span></p>
                            <p className="text-xs text-gray-400">.xlsx, .xls</p>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                        </div>

                        {/* Preview */}
                        {importData.length > 0 && (
                            <div className="mb-5">
                                <p className="text-sm font-medium text-gray-700 mb-3">{importData.length} evento{importData.length !== 1 ? "s" : ""} detectado{importData.length !== 1 ? "s" : ""}:</p>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Nombre</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Tipo</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Inicio</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Fin</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {importData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-gray-800 font-medium">{row.nombre || row.Nombre}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.tipo_evento || row.Tipo_evento}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.fecha_inicio || row.Fecha_inicio}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.fecha_fin || row.Fecha_fin}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {importData.length > 10 && <p className="text-xs text-gray-400 text-center py-2">...y {importData.length - 10} más</p>}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            {importData.length > 0 && (
                                <button onClick={handleImport} disabled={importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50">
                                    {importing ? "Importando..." : `Importar ${importData.length} evento${importData.length !== 1 ? "s" : ""}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete" ? "Eliminar evento" : "Cambiar estado"}
                message={confirmAction?.type === "delete" ? `¿Estás seguro de eliminar "${confirmAction?.event.name}"? Esta acción no se puede deshacer.` : `¿Cambiar el estado de "${confirmAction?.event.name}" a ${(confirmAction?.event.status || "Realizado") === "Realizado" ? "Pendiente" : "Realizado"}?`}
                confirmText={confirmAction?.type === "delete" ? "Eliminar" : "Cambiar estado"}
                variant={confirmAction?.type === "delete" ? "danger" : "warning"}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    )
}
