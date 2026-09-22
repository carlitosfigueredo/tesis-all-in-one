/**
 * ImportResults
 * ─────────────────────────────────────────────────────────────────────────────
 * Pantalla que aparece DESPUÉS de importar el CSV.
 *
 * IMPORTANTE: la importación SOLO carga datos. NO calcula el riesgo. La
 * predicción es un paso aparte (botón "Predecir" en la lista de empleados),
 * que usa el modelo entrenado de la empresa. Por eso esta pantalla NO muestra
 * niveles de riesgo (serían ficticios): solo confirma la carga e invita a
 * predecir.
 *
 * Props:
 *   - summary:   { total, ... }  (usamos total)
 *   - creados, actualizados, dadosDeBaja
 *   - onClose:   cierra y vuelve a la lista de empleados
 *   - onVerEmpleados: (opcional) navega a la lista
 */
export default function ImportResults({ summary, employees = [], creados = 0, actualizados = 0, dadosDeBaja = 0, onClose, onVerEmpleados }) {
  const total = summary?.total ?? employees.length;

  return (
    <div className="space-y-4">
      {/* Confirmación de carga */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-lg">
            ✓
          </div>
          <div>
            <h3 className="text-base font-semibold text-green-800">¡Listo! Datos cargados</h3>
            <p className="mt-1 text-sm text-green-700">
              Se cargaron {total} empleado{total !== 1 ? 's' : ''} correctamente.
            </p>
          </div>
        </div>
      </div>

      {/* Desglose de cambios */}
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

      {/* Próximo paso: predecir */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-800">Próximo paso: predecir el riesgo</p>
        <p className="mt-1 text-sm text-indigo-700">
          Los datos ya están guardados, pero el riesgo de deserción todavía no se calculó. Para obtenerlo,
          usá el botón <strong>“Predecir”</strong> en la lista de empleados. La predicción usa el modelo
          entrenado de tu empresa.
        </p>
        <p className="mt-2 text-xs text-indigo-600">
          Si tu empresa aún no entrenó su modelo, entrenalo primero en la sección <strong>“Modelo ML”</strong>.
        </p>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
        {onVerEmpleados && (
          <button
            onClick={onVerEmpleados}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Ver empleados
          </button>
        )}
      </div>
    </div>
  );
}
