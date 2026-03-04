import { prisma } from "@/lib/prisma"

async function getStats() {
    const [users, persons, events, certificates, assignments] = await Promise.all([
        prisma.user.count(),
        prisma.person.count(),
        prisma.event.count(),
        prisma.certificate.count(),
        prisma.certificateAssignment.count(),
    ])
    return { users, persons, events, certificates, assignments }
}

export default async function DashboardPage() {
    const stats = await getStats()

    const cards = [
        { label: "Usuarios", value: stats.users, color: "bg-brand-500", icon: "👥" },
        { label: "Personas", value: stats.persons, color: "bg-success-500", icon: "🧑‍🤝‍🧑" },
        { label: "Eventos", value: stats.events, color: "bg-[#7a5af8]", icon: "📅" },
        { label: "Certificados", value: stats.certificates, color: "bg-warning-500", icon: "📜" },
        { label: "Asignaciones", value: stats.assignments, color: "bg-error-500", icon: "✅" },
    ]

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-2xl font-semibold text-gray-800">Panel de Control</h2>
                <p className="text-gray-500 text-sm mt-1">Resumen general del sistema de certificados</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs hover:shadow-theme-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-3xl">{card.icon}</span>
                            <div className={`w-3 h-3 rounded-full ${card.color}`}></div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Welcome section */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-xs">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🎓 Bienvenido al Sistema de Certificados</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Utiliza el menú lateral para navegar entre los módulos del sistema.
                    Puedes gestionar usuarios, roles, facultades, personas, eventos, certificados
                    y asignar certificados a personas registradas.
                </p>
            </div>
        </div>
    )
}
