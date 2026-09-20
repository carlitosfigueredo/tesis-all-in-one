/**
 * riskInsights.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lógica compartida para traducir los datos crudos de un empleado en información
 * entendible por cualquier persona (no técnica):
 *
 *   1. FACTORES DE RIESGO  → qué señales concretas empujan el riesgo hacia arriba
 *      o hacia abajo (ej: "22 horas extra al mes", "sin capacitación").
 *   2. RECOMENDACIONES      → qué acciones de retención sugerir según esos factores.
 *   3. EXPLICACIONES        → textos en lenguaje claro sobre qué significa cada
 *      nivel de riesgo.
 *
 * Se calcula en el frontend a partir de los datos que ya tiene cada empleado.
 * Es transparente y auditable a propósito: cualquiera puede leer estas reglas
 * y entender por qué el sistema dice lo que dice.
 *
 * Nota: el porcentaje de riesgo (riesgo_desercion) lo calcula el modelo de ML.
 * Este módulo NO recalcula el riesgo: solo lo EXPLICA en términos humanos.
 */

// ─── Niveles de riesgo ─────────────────────────────────────────────────────────
// Los umbrales coinciden con los del microservicio ML (predict.py).

export const RISK_LEVELS = {
  CRITICO: {
    key: 'CRITICO',
    label: 'Crítico',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-600',
    resumen: 'Necesita atención urgente',
    descripcion:
      'Hay una probabilidad muy alta de que esta persona deje la empresa pronto. ' +
      'Conviene actuar ya: hablar con ella y revisar qué la está empujando a irse.',
  },
  ALTO: {
    key: 'ALTO',
    label: 'Alto',
    color: '#ef4444',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    resumen: 'Requiere seguimiento cercano',
    descripcion:
      'Muestra varias señales de desgaste. Todavía hay margen para retenerla, ' +
      'pero conviene tener una conversación de retención en las próximas semanas.',
  },
  MEDIO: {
    key: 'MEDIO',
    label: 'Medio',
    color: '#f59e0b',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    resumen: 'Vale la pena monitorear',
    descripcion:
      'No hay señales de alarma, pero sí algunos puntos a vigilar. ' +
      'Mantener el seguimiento habitual y cuidar que no empeoren.',
  },
  BAJO: {
    key: 'BAJO',
    label: 'Bajo',
    color: '#22c55e',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
    resumen: 'Estable',
    descripcion:
      'Todo indica que está a gusto y es probable que se quede. ' +
      'Mantener las buenas prácticas que la tienen conforme.',
  },
};

/**
 * Devuelve el nivel de riesgo a partir del score 0.0-1.0.
 * Usa los mismos umbrales que el ML service.
 */
export const getNivelRiesgo = (score) => {
  if (score >= 0.75) return 'CRITICO';
  if (score >= 0.5) return 'ALTO';
  if (score >= 0.3) return 'MEDIO';
  return 'BAJO';
};

/**
 * Devuelve la metadata (colores, textos) de un nivel, tolerante a null.
 */
export const getRiskMeta = (level) => RISK_LEVELS[level] ?? RISK_LEVELS.BAJO;

// ─── Definición de factores de riesgo ──────────────────────────────────────────
// Cada factor sabe leer un empleado y decir:
//   - si está en estado de riesgo (malo) o no
//   - un texto legible del valor actual
//   - una explicación de por qué importa
//   - una acción de retención sugerida cuando está en riesgo
//
// Las reglas están alineadas con la lógica del modelo heurístico (dummy_model.py)
// para que la explicación sea coherente con lo que pesa el modelo.

const FACTORES = [
  {
    key: 'horas_extra',
    label: 'Horas extra',
    // Peso alto en el modelo → sobrecarga y desgaste
    evaluar: (e) => {
      const h = e.cantidad_horas_extra_mes ?? 0;
      return {
        enRiesgo: h > 15,
        critico: h > 25,
        valorTexto: `${h} h/mes`,
        motivo:
          'Trabajar muchas horas extra de forma sostenida genera cansancio y desgaste, ' +
          'y es una de las causas más comunes de renuncia.',
        accion:
          'Revisar la carga de trabajo y redistribuir tareas del equipo para bajar las horas extra.',
      };
    },
  },
  {
    key: 'satisfaccion_laboral',
    label: 'Satisfacción laboral',
    evaluar: (e) => {
      const v = e.satisfaccion_laboral;
      if (v == null) return null; // dato no cargado
      return {
        enRiesgo: v <= 2,
        critico: v === 1,
        valorTexto: `${v}/5`,
        motivo:
          'Una satisfacción baja con el trabajo suele anticipar la decisión de buscar otro empleo.',
        accion:
          'Tener una conversación uno a uno para entender qué la tiene disconforme y qué se puede mejorar.',
      };
    },
  },
  {
    key: 'estancamiento_carrera',
    label: 'Estancamiento profesional',
    evaluar: (e) => {
      const v = e.estancamiento_carrera;
      if (v == null) return null;
      return {
        enRiesgo: v >= 4,
        critico: v === 5,
        valorTexto: `${v}/5`,
        motivo:
          'Sentir que la carrera no avanza empuja a la gente a buscar crecimiento en otro lado.',
        accion:
          'Definir un plan de crecimiento con metas claras, nuevos desafíos o un posible ascenso.',
      };
    },
  },
  {
    key: 'equilibrio_vida_trabajo',
    label: 'Equilibrio vida-trabajo',
    evaluar: (e) => {
      const v = e.equilibrio_vida_trabajo;
      if (v == null) return null;
      return {
        enRiesgo: v <= 2,
        critico: v === 1,
        valorTexto: `${v}/5`,
        motivo:
          'Un mal equilibrio entre la vida personal y el trabajo desgasta y aumenta el deseo de irse.',
        accion:
          'Ofrecer flexibilidad horaria, respetar desconexión fuera de hora y revisar la carga.',
      };
    },
  },
  {
    key: 'feedback_lider',
    label: 'Feedback del líder',
    evaluar: (e) => {
      const v = e.feedback_lider;
      if (v == null) return null;
      return {
        enRiesgo: v <= 2,
        critico: v === 1,
        valorTexto: `${v}/5`,
        motivo:
          'Recibir poco o mal feedback del líder genera desconexión con la empresa.',
        accion:
          'Acordar reuniones de seguimiento periódicas con retroalimentación clara y constructiva.',
      };
    },
  },
  {
    key: 'satisfaccion_ambiente',
    label: 'Ambiente laboral',
    evaluar: (e) => {
      const v = e.satisfaccion_ambiente;
      if (v == null) return null;
      return {
        enRiesgo: v <= 2,
        critico: v === 1,
        valorTexto: `${v}/5`,
        motivo:
          'Un mal clima con el equipo o el entorno de trabajo pesa en la decisión de quedarse.',
        accion:
          'Indagar qué del ambiente incomoda y trabajar la dinámica del equipo.',
      };
    },
  },
  {
    key: 'capacitacion',
    label: 'Capacitación',
    evaluar: (e) => {
      const sin = !e.capacitacion_ultimo_anio;
      return {
        enRiesgo: sin,
        critico: false,
        valorTexto: sin ? 'Sin capacitación' : 'Con capacitación',
        motivo:
          'No recibir capacitación transmite falta de inversión en la persona y frena su desarrollo.',
        accion:
          'Ofrecer cursos, certificaciones o acceso a formación relevante para su rol.',
      };
    },
  },
  {
    key: 'antiguedad',
    label: 'Antigüedad',
    evaluar: (e) => {
      const m = e.antiguedad_meses ?? 0;
      return {
        enRiesgo: m < 12,
        critico: false,
        valorTexto: `${m} meses`,
        motivo:
          'El primer año es el más frágil: el vínculo con la empresa todavía no está consolidado.',
        accion:
          'Reforzar el acompañamiento inicial (onboarding, mentoría) durante el primer año.',
      };
    },
  },
  {
    key: 'tipo_contrato',
    label: 'Tipo de contrato',
    evaluar: (e) => {
      const c = e.tipo_contrato;
      const precario = c === 'Eventual' || c === 'Plazo fijo';
      return {
        enRiesgo: precario,
        critico: c === 'Eventual',
        valorTexto: c ?? '—',
        motivo:
          'Un contrato temporal o eventual da menos sensación de estabilidad y facilita la salida.',
        accion:
          'Evaluar pasar a un contrato indefinido si el desempeño lo justifica.',
      };
    },
  },
  {
    key: 'empresas_anteriores',
    label: 'Historial de empleos',
    evaluar: (e) => {
      const n = e.cantidad_empresas_anteriores ?? 0;
      return {
        enRiesgo: n >= 4,
        critico: false,
        valorTexto: `${n} empresas previas`,
        motivo:
          'Un historial con muchos cambios de empresa sugiere mayor propensión a moverse.',
        accion:
          'Cuidar especialmente los motivos de permanencia: propósito, crecimiento y reconocimiento.',
      };
    },
  },
];

/**
 * Analiza un empleado y devuelve la lista completa de factores evaluados.
 * Los factores con dato faltante (null) se omiten.
 *
 * @returns {Array<{key,label,enRiesgo,critico,valorTexto,motivo,accion}>}
 */
export const evaluarFactores = (emp) =>
  FACTORES.map((f) => {
    const r = f.evaluar(emp);
    if (r == null) return null;
    return { key: f.key, label: f.label, ...r };
  }).filter(Boolean);

/**
 * Devuelve solo los factores que están en estado de riesgo (los "por qué").
 * Ordena los críticos primero.
 */
export const factoresEnRiesgo = (emp) =>
  evaluarFactores(emp)
    .filter((f) => f.enRiesgo)
    .sort((a, b) => Number(b.critico) - Number(a.critico));

/**
 * Genera recomendaciones de retención concretas para un empleado, a partir de
 * los factores que tiene en riesgo. Si no hay factores en riesgo, devuelve una
 * recomendación de mantenimiento.
 *
 * @returns {string[]} lista de acciones sugeridas (sin repetir)
 */
export const generarRecomendaciones = (emp) => {
  const enRiesgo = factoresEnRiesgo(emp);
  if (enRiesgo.length === 0) {
    return [
      'Mantener las condiciones actuales: parece estar a gusto.',
      'Seguir con el seguimiento habitual y reconocer su buen desempeño.',
    ];
  }
  // Acciones únicas, priorizando factores críticos (ya vienen ordenados).
  const vistas = new Set();
  const acciones = [];
  for (const f of enRiesgo) {
    if (!vistas.has(f.accion)) {
      vistas.add(f.accion);
      acciones.push(f.accion);
    }
  }
  return acciones;
};

/**
 * Cuenta cuántas variables de encuesta clima faltan en un empleado.
 * Sirve para avisar que la predicción es menos precisa.
 */
export const contarVariablesClimaFaltantes = (emp) => {
  const campos = [
    'satisfaccion_laboral',
    'satisfaccion_ambiente',
    'equilibrio_vida_trabajo',
    'estancamiento_carrera',
    'feedback_lider',
  ];
  return campos.filter((c) => emp[c] == null).length;
};

/**
 * Resume una lista de empleados en conteos por nivel de riesgo.
 *
 * @returns {{total, critico, alto, medio, bajo, enRiesgo}}
 */
export const resumirRiesgo = (empleados = []) => {
  const acc = { total: empleados.length, critico: 0, alto: 0, medio: 0, bajo: 0 };
  for (const e of empleados) {
    const nivel = e.nivel_riesgo ?? getNivelRiesgo(e.riesgo_desercion ?? 0);
    if (nivel === 'CRITICO') acc.critico += 1;
    else if (nivel === 'ALTO') acc.alto += 1;
    else if (nivel === 'MEDIO') acc.medio += 1;
    else acc.bajo += 1;
  }
  acc.enRiesgo = acc.critico + acc.alto;
  return acc;
};
