"use client"
import { useState } from "react"
import toast, { Toaster } from "react-hot-toast"

interface Event { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; event: Event; issueDate: string }
interface Person { id: number; firstName: string; lastName: string; identification: string }
interface Assignment { id: number; certificate: Certificate; person: Person; participationDetails?: string }

export default function ConsultaPage() {
    const [identification, setIdentification] = useState("")
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [person, setPerson] = useState<Person | null>(null)
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [showPreview, setShowPreview] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!identification.trim()) return
        setLoading(true)
        setSearched(true)
        try {
            const res = await fetch(`/api/consulta?identification=${encodeURIComponent(identification.trim())}`)
            if (res.ok) {
                const data = await res.json()
                setPerson(data.person)
                setAssignments(data.assignments)
                if (data.assignments.length === 0) toast("No se encontraron certificados para esta identificación", { icon: "ℹ️" })
            } else {
                setPerson(null)
                setAssignments([])
                toast.error("No se encontró una persona con esa identificación")
            }
        } catch {
            toast.error("Error de conexión")
        }
        setLoading(false)
    }

    const viewCert = (a: Assignment) => {
        setPreviewHtml(
            a.certificate.templateHtml
                .replace(/\{\{NOMBRE_COMPLETO\}\}/g, `${a.person.firstName} ${a.person.lastName}`)
                .replace(/\{\{IDENTIFICACION\}\}/g, a.person.identification)
                .replace(/\{\{TIPO_PARTICIPACION\}\}/g, a.certificate.participationType)
                .replace(/\{\{NOMBRE_EVENTO\}\}/g, a.certificate.event?.name || "")
                .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(a.certificate.issueDate).toLocaleDateString("es-CO"))
                .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, a.participationDetails || "")
        )
        setShowPreview(true)
    }

    const downloadPDF = async () => {
        const { default: html2canvas } = await import("html2canvas")
        const { jsPDF } = await import("jspdf")
        const el = document.getElementById("cert-preview-public")
        if (!el) return
        const tId = toast.loading("Generando PDF...")
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true })
            const img = canvas.toDataURL("image/png")
            const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] })
            pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2)
            pdf.save("certificado.pdf")
            toast.success("PDF descargado", { id: tId })
        } catch {
            toast.error("Error al generar PDF", { id: tId })
        }
    }

    const pb: Record<string, string> = {
        Ponente: "bg-warning-50 text-warning-600",
        Conferencista: "bg-purple-50 text-purple-600",
        Evaluador: "bg-success-50 text-success-600",
        Asistente: "bg-brand-50 text-brand-600",
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-theme-xs">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-20 flex items-center justify-center ">
                            <img src="/logo.webp" alt="Certificados Online Logo" className="w-40 mb-1" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Consulta de Certificados</h1>
                            <p className="text-xs text-gray-400">Descarga tus certificados digitales</p>
                        </div>
                    </div>
                    <a href="/login" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">Administración →</a>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-10xl mx-auto px-6 py-10 flex-1">
                {/* Search */}
                <div className="max-w-xl mx-auto mb-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Consulta tus Certificados</h2>
                        <p className="text-sm text-gray-500">Ingresa tu número de identificación para ver y descargar tus certificados</p>
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="flex-1 relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={identification}
                                onChange={e => setIdentification(e.target.value)}
                                placeholder="Número de identificación"
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-7 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-theme-xs disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Consultar"}
                        </button>
                    </form>
                </div>

                {/* Results */}
                {searched && !loading && person && (
                    <div className="space-y-5">
                        {/* Person Info */}
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg font-bold shadow-theme-xs">
                                    {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">{person.firstName} {person.lastName}</h3>
                                    <p className="text-sm text-gray-400">Identificación: {person.identification}</p>
                                </div>
                                <div className="ml-auto">
                                    <span className="inline-flex rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-medium text-brand-600">
                                        {assignments.length} certificado(s)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Certificates Grid */}
                        {assignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assignments.map(a => (
                                    <div key={a.id} className="group rounded-2xl border border-gray-200 bg-white shadow-theme-xs p-5 hover:shadow-md hover:border-brand-200 transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-1.5">{a.certificate.event?.name}</h4>
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pb[a.certificate.participationType] || "bg-gray-100 text-gray-600"}`}>
                                                    {a.certificate.participationType}
                                                </span>
                                            </div>
                                            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                                            </div>
                                        </div>

                                        {a.participationDetails && (
                                            <p className="text-xs text-gray-400 mb-3 italic">{a.participationDetails}</p>
                                        )}

                                        <p className="text-xs text-gray-400 mb-4">
                                            Expedido: {new Date(a.certificate.issueDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                                        </p>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => viewCert(a)}
                                                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors"
                                            >
                                                👁 Ver Certificado
                                            </button>
                                            <button
                                                onClick={() => { viewCert(a); setTimeout(downloadPDF, 500) }}
                                                className="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors"
                                            >
                                                ⬇ Descargar PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-gray-400 text-sm">No se encontraron certificados.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!searched && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-theme-xs flex items-center justify-center mx-auto mb-5">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Ingresa tu identificación</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto">Digita tu número de cédula en el campo de búsqueda para ver tus certificados disponibles.</p>
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">Vista Previa del Certificado</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={downloadPDF} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">
                                    ⬇ Descargar PDF
                                </button>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                            </div>
                        </div>
                        <div id="cert-preview-public" className="flex justify-center bg-gray-50 p-6 rounded-xl border border-gray-200 overflow-auto">
                            <div
                                style={{ transform: "scale(0.8)", transformOrigin: "top center", width: '800px', height: '600px' }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                className="shadow-theme-md"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white">
                <div className="max-w-5xl mx-auto px-6 py-5 text-center">
                    <p className="text-xs text-gray-400">Sistema de Certificados Digitales</p>
                </div>
            </footer>
        </div>
    )
}
