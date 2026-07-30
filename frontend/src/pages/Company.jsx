import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PLAN_INFO = {
  BASICO: {
    nombre: 'Plan Estandar',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    frecuencia: 'Mensual',
    descripcion: 'Predicciones actualizadas 1 vez por mes',
  },
  PROFESIONAL: {
    nombre: 'Plan Profesional',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    frecuencia: 'Semanal',
    descripcion: 'Predicciones actualizadas semanalmente',
  },
  CORPORATIVO: {
    nombre: 'Plan Corporativo',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    frecuencia: 'Bajo demanda',
    descripcion: 'Entrena y predice cuando quieras',
  },
};

const FIELD_EXPLANATIONS = [
  {
    grupo: 'Datos que la empresa carga (RRHH)',
    color: 'border-sky-200 bg-sky-50',
    campos: [
      { nombre: 'Rol', descripcion: 'Rol principal del empleado: Frontend, Backend, Fullstack, Mobile, DevOps, QA, Data' },
      { nombre: 'Seniority', descripcion: 'Nivel de experiencia: Trainee, Junior, Semi-Senior, Senior, Lead' },
      { nombre: 'Edad', descripcion: 'Edad del empleado en anios' },
      { nombre: 'Modalidad', descripcion: 'Modalidad de trabajo: Presencial, Hibrido, Remoto' },
      { nombre: 'Contrato', descripcion: 'Tipo de contrato: Indefinido, Plazo fijo, Eventual' },
      { nombre: 'Antiguedad', descripcion: 'Meses que lleva en la empresa' },
      { nombre: 'Salario (Gs.)', descripcion: 'Salario mensual en guaranies' },
      { nombre: 'Hs. Extra/mes', descripcion: 'Promedio de horas extra trabajadas por mes' },
    ],
  },
  {
    grupo: 'Datos de encuesta clima (opcionales)',
    color: 'border-violet-200 bg-violet-50',
    campos: [
      { nombre: 'Satisfaccion', descripcion: 'Satisfaccion laboral del empleado (1-5). Viene de una encuesta interna. NO lo calcula el sistema.' },
      { nombre: 'Equilibrio vida-trabajo', descripcion: 'Percepcion de balance entre lo personal y lo laboral (1-5)' },
      { nombre: 'Estancamiento', descripcion: 'Si el empleado siente que no crece profesionalmente (1-5)' },
      { nombre: 'Feedback del lider', descripcion: 'Calidad de retroalimentacion que recibe (1-5)' },
    ],
  },
  {
    grupo: 'Campos calculados por el sistema (ML)',
    color: 'border-green-200 bg-green-50',
    campos: [
      { nombre: 'Riesgo', descripcion: 'Probabilidad de desercion calculada por el modelo de Machine Learning (0-100%). Es el UNICO campo que predice el sistema.' },
      { nombre: 'Nivel de riesgo', descripcion: 'Clasificacion automatica: BAJO (<30%), MEDIO (30-50%), ALTO (50-75%), CRITICO (>75%)' },
    ],
  },
  {
    grupo: 'Dato historico',
    color: 'border-amber-200 bg-amber-50',
    campos: [
      { nombre: 'Desercion', descripcion: 'Indica si el empleado efectivamente se fue de la empresa. Es un dato real, no una prediccion. Sirve para validar que tan bien predice el modelo.' },
    ],
  },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function Company() {
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const plan = user?.companyPlan ?? 'BASICO';
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.BASICO;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, subRes, statsRes] = await Promise.allSettled([
          api.get('/users'),
          api.get('/payments/subscription'),
          api.get('/employees/stats'),
        ]);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data || []);
        if (subRes.status === 'fulfilled') setSubscription(subRes.value.data.data);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      } catch { /* silenciar */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Mi Empresa" />
        <main className="flex-1 p-6 space-y-6">

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!loading && (
            <>
              {/* ── Info de la empresa ── */}
              <div className="grid gap-6 lg:grid-cols-3">

                {/* Card empresa */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl">
                      🏢
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{user?.companyName ?? 'Mi Empresa'}</h2>
                      <p className="text-xs text-gray-500">ID: {user?.companyId?.slice(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Plan actual</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planInfo.color}`}>
                        {planInfo.nombre}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Frecuencia prediccion</span>
                      <span className="text-sm font-medium text-gray-700">{planInfo.frecuencia}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Empleados cargados</span>
                      <span className="text-sm font-medium text-gray-700">{stats?.total ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Usuarios</span>
                      <span className="text-sm font-medium text-gray-700">{users.length}</span>
                    </div>
                    {subscription && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Proxima renovacion</span>
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-PY')}
                        </span>
                      </div>
                    )}
                  </div>

                  {plan !== 'CORPORATIVO' && (
                    <button
                      onClick={() => navigate('/checkout')}
                      className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Mejorar plan
                    </button>
                  )}
                </div>

                {/* Card usuarios (solo admin) */}
                {isCompanyAdmin && (
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Usuarios de la empresa</h3>
                      <button
                        onClick={() => navigate('/users')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Gestionar usuarios
                      </button>
                    </div>

                    {users.length === 0 ? (
                      <p className="text-sm text-gray-400">No hay usuarios cargados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                              <th className="px-3 py-2 text-left">Nombre</th>
                              <th className="px-3 py-2 text-left">Email</th>
                              <th className="px-3 py-2 text-left">Rol</th>
                              <th className="px-3 py-2 text-left">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {users.slice(0, 10).map((u) => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">{u.name}</td>
                                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                                <td className="px-3 py-2">
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    {u.roles?.[0] ?? 'Sin rol'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {u.active ? (
                                    <span className="text-green-600 text-xs font-medium">Activo</span>
                                  ) : (
                                    <span className="text-red-500 text-xs font-medium">Inactivo</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Explicacion de los campos del tablero ── */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 mb-1">Que significan los campos del tablero de empleados</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Entende de donde viene cada dato y cuales son calculados por el sistema de prediccion.
                </p>

                <div className="grid gap-4 lg:grid-cols-2">
                  {FIELD_EXPLANATIONS.map((grupo) => (
                    <div key={grupo.grupo} className={`rounded-lg border p-4 ${grupo.color}`}>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">{grupo.grupo}</h4>
                      <ul className="space-y-1.5">
                        {grupo.campos.map((campo) => (
                          <li key={campo.nombre} className="text-xs text-gray-700">
                            <span className="font-semibold">{campo.nombre}:</span>{' '}
                            <span className="text-gray-600">{campo.descripcion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  <p className="font-semibold">Resumen rapido:</p>
                  <p className="mt-1">
                    La empresa carga los datos de sus empleados (CSV o manual). El unico campo que el sistema
                    calcula automaticamente es el <strong>Riesgo de Desercion</strong> — usando un modelo de Machine Learning
                    entrenado con datos del mercado de software de Paraguay. Todo lo demas son datos de entrada.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
