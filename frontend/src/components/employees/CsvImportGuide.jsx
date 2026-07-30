import { useState } from 'react';

// ─── Definicion de campos del CSV ────────────────────────────────────────────

const CSV_FIELDS = [
  // Obligatorios (datos RRHH)
  {
    campo: 'edad',
    tipo: 'Numero',
    obligatorio: true,
    descripcion: 'Edad del empleado en anios',
    valores: '18 a 65',
    ejemplo: '28',
    fuente: 'rrhh',
  },
  {
    campo: 'nivel_formacion',
    tipo: 'Texto',
    obligatorio: true,
    descripcion: 'Nivel educativo mas alto alcanzado',
    valores: 'Secundaria, Tecnico, Universitario, Posgrado',
    ejemplo: 'Universitario',
    fuente: 'rrhh',
  },
  {
    campo: 'rol_tecnologico',
    tipo: 'Texto',
    obligatorio: true,
    descripcion: 'Rol principal en el equipo de desarrollo',
    valores: 'Frontend, Backend, Fullstack, Mobile, DevOps, QA, Data',
    ejemplo: 'Backend',
    fuente: 'rrhh',
  },
  {
    campo: 'seniority',
    tipo: 'Texto',
    obligatorio: true,
    descripcion: 'Nivel de experiencia del empleado',
    valores: 'Trainee, Junior, Semi-Senior, Senior, Lead',
    ejemplo: 'Semi-Senior',
    fuente: 'rrhh',
  },
  {
    campo: 'antiguedad_meses',
    tipo: 'Numero',
    obligatorio: true,
    descripcion: 'Meses que lleva en la empresa',
    valores: '0 a 360',
    ejemplo: '18',
    fuente: 'rrhh',
  },
  {
    campo: 'modalidad_trabajo',
    tipo: 'Texto',
    obligatorio: true,
    descripcion: 'Modalidad de trabajo contractual',
    valores: 'Presencial, Hibrido, Remoto',
    ejemplo: 'Hibrido',
    fuente: 'rrhh',
  },
  {
    campo: 'tipo_contrato',
    tipo: 'Texto',
    obligatorio: true,
    descripcion: 'Tipo de contrato laboral vigente',
    valores: 'Indefinido, Plazo fijo, Eventual',
    ejemplo: 'Indefinido',
    fuente: 'rrhh',
  },
  {
    campo: 'salario_mensual',
    tipo: 'Numero',
    obligatorio: true,
    descripcion: 'Salario mensual en guaranies (Gs.) sin puntos ni comas',
    valores: 'Ej: 8500000 (no 8.500.000)',
    ejemplo: '8500000',
    fuente: 'rrhh',
  },
  {
    campo: 'cantidad_horas_extra_mes',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Promedio de horas extra mensuales. Si no se tiene, dejar en 0',
    valores: '0 a 80',
    ejemplo: '10',
    fuente: 'rrhh',
  },
  {
    campo: 'capacitacion_ultimo_anio',
    tipo: 'Texto',
    obligatorio: false,
    descripcion: 'Si recibio capacitacion formal en los ultimos 12 meses',
    valores: 'Si, No',
    ejemplo: 'Si',
    fuente: 'rrhh',
  },
  {
    campo: 'evaluacion_desempeno',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Ultima calificacion de evaluacion de desempeno',
    valores: '1 (Muy bajo) a 5 (Excelente)',
    ejemplo: '4',
    fuente: 'rrhh',
  },
  {
    campo: 'cantidad_empresas_anteriores',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Empresas donde trabajo antes de la actual',
    valores: '0 a 15',
    ejemplo: '2',
    fuente: 'rrhh',
  },
  // Opcionales (encuesta clima)
  {
    campo: 'satisfaccion_laboral',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Que tan satisfecho esta con su trabajo (encuesta interna)',
    valores: '1 (Muy baja) a 5 (Muy alta)',
    ejemplo: '3',
    fuente: 'clima',
    importante: true,
  },
  {
    campo: 'satisfaccion_ambiente',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Satisfaccion con el ambiente y entorno laboral',
    valores: '1 (Muy baja) a 5 (Muy alta)',
    ejemplo: '4',
    fuente: 'clima',
  },
  {
    campo: 'equilibrio_vida_trabajo',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Percepcion de balance entre vida personal y trabajo',
    valores: '1 (Muy malo) a 5 (Muy bueno)',
    ejemplo: '3',
    fuente: 'clima',
    importante: true,
  },
  {
    campo: 'estancamiento_carrera',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Percepcion de estancamiento profesional',
    valores: '1 (Nada estancado) a 5 (Muy estancado)',
    ejemplo: '2',
    fuente: 'clima',
    importante: true,
  },
  {
    campo: 'feedback_lider',
    tipo: 'Numero',
    obligatorio: false,
    descripcion: 'Calidad de retroalimentacion del lider directo',
    valores: '1 (Muy mala) a 5 (Muy buena)',
    ejemplo: '3',
    fuente: 'clima',
  },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function CsvImportGuide({ onClose }) {
  const [step, setStep] = useState(1);

  const totalSteps = 4;

  const downloadTemplate = () => {
    const headers = CSV_FIELDS.map((f) => f.campo).join(',');
    const exampleRow = CSV_FIELDS.map((f) => f.ejemplo).join(',');
    const csv = `${headers}\n${exampleRow}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_empleados.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Barra de progreso */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
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

      {/* ── Paso 1: Preparar datos ── */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">Paso 1: Prepara tus datos</h3>
          <p className="text-sm text-gray-600">
            Necesitas un archivo CSV con los datos de tus empleados. Los datos vienen de dos fuentes:
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <p className="text-sm font-semibold text-sky-700">Datos de RRHH (obligatorios)</p>
              <p className="mt-1 text-xs text-sky-600">
                Informacion que tu area de Recursos Humanos ya tiene: edad, rol, seniority, salario,
                antiguedad, modalidad de trabajo, tipo de contrato.
              </p>
              <p className="mt-2 text-xs font-medium text-sky-700">8 campos obligatorios</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <p className="text-sm font-semibold text-violet-700">Encuesta clima (opcionales)</p>
              <p className="mt-1 text-xs text-violet-600">
                Datos que se obtienen de una encuesta interna a los empleados: satisfaccion,
                equilibrio vida-trabajo, estancamiento, feedback del lider.
              </p>
              <p className="mt-2 text-xs font-medium text-violet-700">5 campos opcionales (mejoran la prediccion)</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <p className="font-semibold">Importante:</p>
            <p className="mt-1">
              Si no tenes los datos de encuesta clima, podes subir el CSV solo con los datos de RRHH.
              El modelo hara la prediccion con menor precision y te avisara cuales variables faltan.
            </p>
          </div>
        </div>
      )}

      {/* ── Paso 2: Formato del CSV ── */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">Paso 2: Formato del archivo CSV</h3>
          <p className="text-sm text-gray-600">
            Tu archivo debe tener las columnas en la primera fila (headers) y un empleado por fila.
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Campo</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Tipo</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Requerido</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Valores</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Ejemplo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CSV_FIELDS.map((f) => (
                  <tr key={f.campo} className={`hover:bg-gray-50 ${f.importante ? 'bg-violet-50/50' : ''}`}>
                    <td className="px-2 py-1.5 font-mono text-gray-800">{f.campo}</td>
                    <td className="px-2 py-1.5 text-gray-500">{f.tipo}</td>
                    <td className="px-2 py-1.5">
                      {f.obligatorio ? (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-700 font-medium">Si</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-[200px] truncate" title={f.valores}>{f.valores}</td>
                    <td className="px-2 py-1.5 font-mono text-blue-700">{f.ejemplo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar plantilla CSV
          </button>
        </div>
      )}

      {/* ── Paso 3: Subir archivo ── */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">Paso 3: Subi tu archivo</h3>
          <p className="text-sm text-gray-600">
            Selecciona el archivo CSV que preparaste. El sistema validara los datos antes de importar.
          </p>

          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">
              Usa el boton "Seleccionar archivo" del formulario de importacion
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Formato: CSV con separador coma (,) · Codificacion: UTF-8 · Maximo: 5000 filas
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">El sistema verificara:</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Que todos los campos obligatorios esten presentes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Que los valores categoricos sean validos (rol, seniority, modalidad, etc.)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Que las edades esten en rango 18-65
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Que el salario sea un numero positivo
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Paso 4: Resultado ── */}
      {step === 4 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">Paso 4: Prediccion automatica</h3>
          <p className="text-sm text-gray-600">
            Una vez importados, el sistema calcula automaticamente el riesgo de desercion de cada empleado.
          </p>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-green-700">Lo que pasa al importar:</p>
            <ol className="space-y-1.5 text-xs text-green-700 list-decimal list-inside">
              <li>Se validan todos los datos del CSV</li>
              <li>Se envian los datos al modelo de Machine Learning</li>
              <li>El modelo calcula el riesgo de desercion (0% a 100%)</li>
              <li>Se asigna un nivel: BAJO, MEDIO, ALTO o CRITICO</li>
              <li>Los empleados quedan guardados con su prediccion</li>
            </ol>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-semibold">Despues de importar:</p>
            <ul className="mt-1 space-y-1">
              <li>• Podes ver los resultados en el Dashboard</li>
              <li>• Podes filtrar empleados por nivel de riesgo</li>
              <li>• Si agregas datos de encuesta clima despues, podes recalcular las predicciones</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Navegacion ── */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={step === 1 ? onClose : () => setStep(step - 1)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {step === 1 ? 'Cerrar guia' : 'Anterior'}
        </button>
        <div className="flex gap-2">
          {step === 2 && (
            <button
              onClick={downloadTemplate}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Descargar plantilla
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Entendido, importar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
