import { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Usuarios mock del portal de empresa (en producción vienen de /api/users)
const MOCK_USERS = [
  { id: 'cu-1', name: 'Ana García',   email: 'admin@empresa.com',    role: 'COMPANY_ADMIN', active: true,  createdAt: '2025-01-15T00:00:00Z' },
  { id: 'cu-2', name: 'Carlos López', email: 'analista@empresa.com', role: 'ANALYST',       active: true,  createdAt: '2025-03-10T00:00:00Z' },
  { id: 'cu-3', name: 'María Torres', email: 'viewer@empresa.com',   role: 'VIEWER',        active: true,  createdAt: '2025-06-01T00:00:00Z' },
];

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Administrador',
  ANALYST:       'Analista',
  VIEWER:        'Solo lectura',
};

const ROLE_COLORS = {
  COMPANY_ADMIN: 'bg-purple-100 text-purple-700',
  ANALYST:       'bg-blue-100 text-blue-700',
  VIEWER:        'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { name: '', email: '', role: 'ANALYST', password: '', confirmPassword: '' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'COMPANY_ADMIN';

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState([]);
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    // En producción: api.get('/users')
    // Por ahora usamos el mock
    setTimeout(() => {
      setUsers(MOCK_USERS);
      setLoading(false);
    }, 300);
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setErrors(['Las contraseñas no coinciden']);
      return;
    }
    if (form.password.length < 8) {
      setErrors(['La contraseña debe tener al menos 8 caracteres']);
      return;
    }

    setSaving(true);
    try {
      // En producción: await api.post('/users', { name, email, role, password })
      const newUser = {
        id:        `u-${Date.now()}`,
        name:      form.name,
        email:     form.email,
        role:      form.role,
        active:    true,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
      setSuccess(`Usuario "${form.name}" creado correctamente`);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setErrors([err.response?.data?.message ?? 'Error al crear el usuario']);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (id) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Usuarios de la empresa" />
        <main className="flex-1 p-6">

          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {users.length} usuario(s) en <strong>{currentUser?.companyName}</strong>
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setShowForm((v) => !v); setErrors([]); }}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo usuario
              </button>
            )}
          </div>

          {/* Aviso de solo lectura para no-admin */}
          {!isAdmin && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Solo el Administrador de empresa puede crear o modificar usuarios.
            </div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Formulario de creación */}
          {showForm && isAdmin && (
            <div className="mb-6 rounded-xl bg-white border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Crear nuevo usuario</h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                  <input
                    name="name" value={form.name} onChange={handleChange} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="Ej: Laura Martínez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    name="role" value={form.role} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="ANALYST">Analista — puede analizar y ver predicciones</option>
                    <option value="VIEWER">Solo lectura — solo puede ver datos</option>
                  </select>
                </div>
                <div />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal</label>
                  <input
                    name="password" type="password" value={form.password} onChange={handleChange} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input
                    name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                {errors.length > 0 && (
                  <div className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 space-y-1">
                    {errors.map((e, i) => <p key={i}>• {e}</p>)}
                  </div>
                )}

                <div className="sm:col-span-2 flex gap-3">
                  <button
                    type="submit" disabled={saving}
                    className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Creando...' : 'Crear usuario'}
                  </button>
                  <button
                    type="button" onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Nombre</th>
                    <th className="px-5 py-3 text-left">Correo</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Registrado</th>
                    {isAdmin && <th className="px-5 py-3 text-left">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600 flex-shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                          {u.id === currentUser?.id && (
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">Yo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.active
                          ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Activo</span>
                          : <span className="inline-flex items-center gap-1 text-gray-400 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-gray-300" />Inactivo</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('es-PY')}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => toggleActive(u.id)}
                              className={`text-xs rounded px-2 py-1 transition-colors ${
                                u.active
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {u.active ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
