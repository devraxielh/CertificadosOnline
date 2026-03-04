"use client"

import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"

interface Permission { id: number; name: string; description?: string }
interface Role { id: number; name: string; _count?: { users: number }; permissions?: Permission[] }

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([])
    const [permissionsList, setPermissionsList] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [name, setName] = useState("")
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
    const [error, setError] = useState("")

    const fetchRoles = useCallback(async () => {
        const [resRoles, resPerms] = await Promise.all([fetch("/api/roles"), fetch("/api/permissions")])
        if (resRoles.ok) setRoles(await resRoles.json())
        if (resPerms.ok) setPermissionsList(await resPerms.json())
        setLoading(false)
    }, [])
    useEffect(() => { fetchRoles() }, [fetchRoles])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles"
        const res = await fetch(url, {
            method: editingRole ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, permissionIds: selectedPermissions })
        })
        if (res.ok) {
            toast.success(editingRole ? "Rol actualizado" : "Rol creado")
            setShowModal(false); setEditingRole(null); setName(""); setSelectedPermissions([]); fetchRoles()
        } else {
            toast.error("Error al guardar el rol")
            setError("Error al guardar el rol")
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este rol?")) return;
        const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Rol eliminado")
            fetchRoles()
        } else {
            toast.error("Error al eliminar el rol")
        }
    }
    const openCreate = () => { setEditingRole(null); setName(""); setSelectedPermissions([]); setError(""); setShowModal(true) }
    const openEdit = (role: Role) => {
        setEditingRole(role)
        setName(role.name)
        setSelectedPermissions(role.permissions?.map(p => p.id) || [])
        setError("")
        setShowModal(true)
    }

    const togglePermission = (id: number) => {
        setSelectedPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Roles</h2><p className="text-gray-500 text-sm mt-1">Gestión de roles del sistema</p></div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuevo Rol
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Usuarios</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Permisos</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {roles.map((role) => (
                                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">{role.id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{role.name}</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">{role._count?.users || 0}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions && role.permissions.length > 0 ? (
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                                        {role.permissions.length} permiso(s)
                                                    </span>
                                                ) : <span className="text-xs text-gray-400">Ninguno</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEdit(role)} className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Editar</button>
                                            <button onClick={() => handleDelete(role.id)} className="inline-flex items-center rounded-lg border border-error-100 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-100 transition-colors">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                {roles.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No hay roles registrados</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingRole ? "Editar Rol" : "Nuevo Rol"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del rol</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" placeholder="Nombre del rol" />
                            </div>

                            {permissionsList.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Permisos Asignados</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                                        {Object.entries(
                                            permissionsList.reduce((acc, perm) => {
                                                const parts = perm.name.split('_');
                                                const resource = parts.slice(1).join('_') || 'others';
                                                if (!acc[resource]) acc[resource] = [];
                                                acc[resource].push(perm);
                                                return acc;
                                            }, {} as Record<string, Permission[]>)
                                        ).map(([resource, perms]) => {
                                            const resNames: Record<string, string> = { user: "Usuarios", role: "Roles", faculty: "Facultades", program: "Programas", event: "Eventos", certificate: "Certificados", person: "Personas", assignment: "Asignaciones" };
                                            const actNames: Record<string, string> = { create: "Crear", read: "Ver", update: "Editar", delete: "Eliminar" };

                                            const toggleAllResource = (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const resIds = perms.map(p => p.id);
                                                if (e.target.checked) setSelectedPermissions(prev => Array.from(new Set([...prev, ...resIds])));
                                                else setSelectedPermissions(prev => prev.filter(id => !resIds.includes(id)));
                                            };
                                            const isAllSelected = perms.every(p => selectedPermissions.includes(p.id));
                                            const isSomeSelected = perms.some(p => selectedPermissions.includes(p.id)) && !isAllSelected;

                                            return (
                                                <div key={resource} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                                        <h4 className="text-sm font-semibold text-gray-800 capitalize">
                                                            {resNames[resource] || resource}
                                                        </h4>
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            ref={el => { if (el) el.indeterminate = isSomeSelected }}
                                                            onChange={toggleAllResource}
                                                            className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {perms.map(perm => {
                                                            const action = perm.name.split('_')[0];
                                                            return (
                                                                <label key={perm.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedPermissions.includes(perm.id)}
                                                                        onChange={() => togglePermission(perm.id)}
                                                                        className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                                                    />
                                                                    <span className="text-sm text-gray-700">{actNames[action] || action}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
