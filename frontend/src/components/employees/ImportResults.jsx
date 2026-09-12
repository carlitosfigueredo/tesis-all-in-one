import { useState } from 'react';
import {
  RISK_LEVELS,
  getRiskMeta,
  factoresEnRiesgo,
  generarRecomendaciones,
} from '../../utils/riskInsights';

/**
 * ImportResults
 * ─────────────────────────────────────────────────────────────────────────────
 * Pantalla que aparece DESPUÉS de importar el CSV. Explica, en lenguaje claro y
 * paso a paso, qué encontró el sistema: cuántos empleados se analizaron, cómo se
 * reparte el riesgo, qué significa todo eso, y quiénes necesitan atención primero.
 *
 * Props:
 *   - summary:   { total, critico, alto, medio, bajo }  (viene del backend)
 *   - employees: array de empleados con su predicción    (viene del backend)
 *   - onClose:   cierra y vuelve a la lista de empleados
 *   - onVerEmpleados: (opcional) navega a la lista filtrada
 */
export default function ImportResults({ summary, employees = [], creados = 0, actualizados = 0, dadosDeBaja = 0, recalculo = null, onClose, onVerEmpleados }) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // ¿Se recalculó el riesgo en esta importación, o quedó pendiente por el plan?
  const riesgoPendiente = recalculo && recalculo.aplicado === false;
  const proximaFechaTexto = recalculo?.proximaFecha
    ? new Date(recalculo.proximaFecha).toLocaleDateString('es-PY')
    : null;

  const total = summary?.total ?? employees.length;
  const critico = summary?.critico ?? 0;
  const alto = summary?.alto ?? 0;
  const medio = summary?.medio ?? 0;
  const bajo = summary?.bajo ?? 0;
  const enRiesgo = critico + alto;

  // Empleados que necesitan atención primero (crítico + alto), ordenados.
  const prioritarios = [...employees]
    .filter((e) => e.nivel_riesgo === 'CRITICO' || e.nivel_riesgo === 'ALTO')
    .sort((a, b) => (b.riesgo_desercion ?? 0) - (a.riesgo_desercion ?? 0))
    .slice(0, 8);

  // Frase-resumen en lenguaje humano.
  const fraseResumen = (() => {
    if (total === 0) return 'No se importaron empleados.';
    if (enRiesgo === 0) {
      return `Analicé ${total} empleado${total !== 1 ? 's' : ''} y la buena noticia es que ninguno muestra un riesgo alto de irse.`;
    }
    return `Analicé ${total} empleado${total !== 1 ? 's' : ''}: ${enRiesgo} necesita${enRiesgo !== 1 ? 'n' : ''} atención pronto y el resto está más estable.`;
  })();

  return (
    <div className="space-y-4">
      {/* Barra de progreso (mismo estilo que la guía de importación) */}
      <div className="flex items-center gap-2 mb-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < totalSteps && (
              <div className={`h-0.5 w-8 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
        <span className="ml-3 text-xs text-gray-500">Paso {step} de {totalSteps}</span>
      </div>

      {/* ── Paso 1: Qué pasó (resumen general) ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-lg">
                ✓
              </div>
              <div>
                <h3 className="text-base font-semibold text-green-800">¡Listo! Importación completada</h3>
                <p className="mt-1 text-sm text-green-700">{fraseResumen}</p>
              </div>
            </div>
          </div>

          {/* Desglose de cambios (nuevos / actualizados / bajas) */}
          {(creados > 0 || actualizados > 0 || dadosDeBaja > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {creados > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  {creados} nuevo{creados !== 1 ? 's' : ''}
                </span>
              )}
              {actualizados > 0 && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700">
                  {actualizados} actualizado{actualizados !== 1 ? 's' : ''}
                </span>
              )}
              {dadosDeBaja > 0 && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">
                  {dadosDeBaja} dado{dadosDeBaja !== 1 ? 's' : ''} de baja
                </span>
              )}
            </div>
          )}

          {/* Estado del recálculo del riesgo según el plan */}
          {riesgoPendiente ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">Datos guardados — riesgo aún no actualizado</p>
              <p className="mt-1 text-xs text-amber-700">
                Tu plan actualiza las predicciones de forma <strong>{recalculo.frecuencia}</strong>. Los
                datos que importaste ya quedaron guardados, pero el riesgo mostrado corresponde al último
                cálculo.
                {proximaFechaTexto && (
                  <> El próximo recálculo estará disponible el <strong>{proximaFechaTexto}</strong>
                  {recalculo.diasParaProxima > 0 && ` (en ${recalculo.diasParaProxima} día${recalculo.diasParaProxima !== 1 ? 's' : ''})`}.</>
                )}
              </p>
              <p className="mt-1.5 text-xs text-amber-600">
                ¿Necesitás predicciones al instante? El plan Corporativo actualiza el riesgo cada vez que subís datos.
              </p>
            </div>
          ) : recalculo?.aplicado ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Riesgo actualizado.</span> Se recalculó la probabilidad de
                deserción de cada empleado con los datos más recientes.
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Así se reparte el riesgo de tu equipo:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { nivel: 'CRITICO', valor: critico },
                { nivel: 'ALTO', valor: alto },
                { nivel: 'MEDIO', valor: medio },
                { nivel: 'BAJO', valor: bajo },
              ].map(({ nivel, valor }) => {
                const meta = RISK_LEVELS[nivel];
                const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
                return (
                  <div
                    key={nivel}
                    className={`rounded-xl border ${meta.border} ${meta.bg} p-3 text-center`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                      <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                    </div>
                    <p className={`mt-1 text-2xl font-bold ${meta.text}`}>{valor}</p>
                    <p className="text-xs text-gray-400">{pct}% del total</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Tip:</span> los colores funcionan como un
              semáforo. El rojo indica quiénes podrían irse pronto y merecen tu atención primero;
              el verde, quiénes están a gusto.
            </p>
          </div>
        </div>
      )}

      {/* ── Paso 2: Qué significa esto ── */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">¿Qué significa esto?</h3>
          <p className="text-sm text-gray-600">
            El sistema no adivina el futuro. Mira 17 datos de cada empleado (salario, horas extra,
            satisfacción, antigüedad, etc.) y, comparándolos con patrones aprendidos, estima
            <strong> qué tan probable es que esa persona deje la empresa</strong>.
          </p>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Importante:</span> un riesgo alto NO significa que la
              persona se vaya seguro. Es una señal para prestar atención y actuar a tiempo. La decisión
              siempre es humana; el sistema solo te ayuda a priorizar.
            </p>
          </div>

          <p className="text-sm font-semibold text-gray-700 mt-2">Cómo leer cada nivel:</p>
          <div className="space-y-2">
            {['CRITICO', 'ALTO', 'MEDIO', 'BAJO'].map((nivel) => {
              const meta = RISK_LEVELS[nivel];
              return (
                <div
                  key={nivel}
                  className={`flex items-start gap-3 rounded-lg border ${meta.border} ${meta.bg} p-3`}
                >
                  <span className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${meta.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${meta.text}`}>
                      {meta.label} — {meta.resumen}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">{meta.descripcion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Paso 3: A quiénes atender primero ── */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">¿Por dónde empiezo?</h3>

          {prioritarios.length === 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Ninguno de los empleados importados está en riesgo alto o crítico. Tu equipo se ve
              estable. Mantené las buenas prácticas y seguí monitoreando de forma habitual.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Estos son los empleados que conviene atender primero. Para cada uno, el sistema muestra
                <strong> por qué</strong> está en riesgo y <strong>qué podés hacer</strong> para retenerlo.
              </p>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {prioritarios.map((emp, idx) => {
                  const meta = getRiskMeta(emp.nivel_riesgo);
                  const factores = factoresEnRiesgo(emp).slice(0, 3);
                  const recomendaciones = generarRecomendaciones(emp).slice(0, 2);
                  const pct = Math.round((emp.riesgo_desercion ?? 0) * 100);
                  return (
                    <div
                      key={emp.id ?? idx}
                      className={`rounded-lg border ${meta.border} bg-white p-3`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {emp.nombre ? `${emp.nombre} ${emp.apellido}` : `${emp.rol_tecnologico} · ${emp.seniority}`}
                            <span className="ml-1.5 font-normal text-xs text-gray-400">
                              {emp.rol_tecnologico} · {emp.seniority}
                            </span>
                          </span>
                        </div>
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background: meta.color + '20', color: meta.color }}
                        >
                          {meta.label} · {pct}%
                        </span>
                      </div>

                      {factores.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Por qué:</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {factores.map((f) => (
                              <span
                                key={f.key}
                                className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600"
                              >
                                {f.label}: {f.valorTexto}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {recomendaciones.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Qué hacer:</p>
                          <ul className="mt-1 space-y-0.5">
                            {recomendaciones.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="mt-0.5 text-green-500">→</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {enRiesgo > prioritarios.length && (
                <p className="text-xs text-gray-400">
                  Y {enRiesgo - prioritarios.length} empleado(s) más en riesgo. Podés verlos todos en la
                  lista, filtrando por nivel de riesgo.
                </p>
              )}
            </>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-semibold">Siguiente paso:</p>
            <ul className="mt-1 space-y-1">
              <li>• Hacé clic en cualquier empleado de la lista para ver el análisis completo.</li>
              <li>• Filtrá por nivel de riesgo para enfocarte en los casos que importan.</li>
              <li>• Si más adelante cargás datos de encuesta de clima, podés recalcular las predicciones.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Navegación ── */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={step === 1 ? onClose : () => setStep(step - 1)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {step === 1 ? 'Cerrar' : 'Anterior'}
        </button>
        <div className="flex gap-2">
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={onVerEmpleados ?? onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver todos los empleados
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
