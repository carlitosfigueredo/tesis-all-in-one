/**
 * retentionFactors.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Catálogo de FACTORES DE RIESGO y las ESTRATEGIAS DE RETENCIÓN que se derivan
 * de ellos. Es la versión de backend de la lógica que vive en el frontend
 * (frontend/src/utils/riskInsights.js), para poder GENERAR y PERSISTIR
 * estrategias concretas por empleado.
 *
 * Cada factor sabe leer un empleado y decidir si está "en riesgo" en esa
 * dimensión; si lo está, produce una estrategia de retención accionable
 * (título + descripción + motivo + prioridad).
 *
 * Es transparente y auditable a propósito: cualquiera puede leer estas reglas
 * y entender por qué el sistema sugiere cada acción.
 */

// Prioridad de la estrategia según si el factor está en estado crítico.
const PRIORIDAD_CRITICA = 'CRITICA';
const PRIORIDAD_ALTA = 'ALTA';
const PRIORIDAD_MEDIA = 'MEDIA';

/**
 * Cada entrada evalúa un empleado y, si aplica, describe la acción de retención.
 * evaluar(emp) => null (dato faltante) | { enRiesgo, critico, valorTexto, titulo, descripcion, motivo }
 */
const FACTORES = [
  {
    key: 'horas_extra',
    label: 'Horas extra',
    evaluar: (e) => {
      const h = e.cantidad_horas_extra_mes ?? 0;
      return {
        enRiesgo: h > 15,
        critico: h > 25,
        valorTexto: `${h} h/mes`,
        titulo: 'Reducir la carga de horas extra',
        descripcion:
          'Revisar la carga de trabajo y redistribuir tareas del equipo para bajar las horas extra sostenidas.',
        motivo:
          'Trabajar muchas horas extra de forma sostenida genera cansancio y desgaste, ' +
          'y es una de las causas más comunes de renuncia.',
      };
    },
  },
  {
    key: 'satisfaccion_laboral',
    label: 'Satisfacción laboral',
    evaluar: (e) => {
      const v = e.satisfaccion_laboral;
      if (v == null) return null;
      return {
        enRiesgo: v <= 2,
        critico: v === 1,
        valorTexto: `${v}/5`,
        titulo: 'Conversación uno a uno de satisfacción',
        descripcion:
          'Tener una conversación uno a uno para entender qué la tiene disconforme y acordar mejoras concretas.',
        motivo:
          'Una satisfacción baja con el trabajo suele anticipar la decisión de buscar otro empleo.',
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
        titulo: 'Definir un plan de crecimiento',
        descripcion:
          'Definir un plan de carrera con metas claras, nuevos desafíos o un posible ascenso.',
        motivo:
          'Sentir que la carrera no avanza empuja a la gente a buscar crecimiento en otro lado.',
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
        titulo: 'Mejorar el equilibrio vida-trabajo',
        descripcion:
          'Ofrecer flexibilidad horaria, respetar la desconexión fuera de hora y revisar la carga de trabajo.',
        motivo:
          'Un mal equilibrio entre la vida personal y el trabajo desgasta y aumenta el deseo de irse.',
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
        titulo: 'Establecer feedback periódico del líder',
        descripcion:
          'Acordar reuniones de seguimiento periódicas con retroalimentación clara y constructiva.',
        motivo:
          'Recibir poco o mal feedback del líder genera desconexión con la empresa.',
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
        titulo: 'Trabajar el clima del equipo',
        descripcion:
          'Indagar qué del ambiente incomoda y trabajar la dinámica del equipo.',
        motivo:
          'Un mal clima con el equipo o el entorno de trabajo pesa en la decisión de quedarse.',
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
        titulo: 'Ofrecer capacitación relevante',
        descripcion:
          'Ofrecer cursos, certificaciones o acceso a formación relevante para su rol.',
        motivo:
          'No recibir capacitación transmite falta de inversión en la persona y frena su desarrollo.',
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
        titulo: 'Reforzar el acompañamiento inicial',
        descripcion:
          'Reforzar el onboarding y la mentoría durante el primer año, que es el más frágil.',
        motivo:
          'El primer año es el más frágil: el vínculo con la empresa todavía no está consolidado.',
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
        titulo: 'Evaluar estabilidad contractual',
        descripcion:
          'Evaluar pasar a un contrato indefinido si el desempeño lo justifica.',
        motivo:
          'Un contrato temporal o eventual da menos sensación de estabilidad y facilita la salida.',
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
        titulo: 'Cuidar los motivos de permanencia',
        descripcion:
          'Cuidar especialmente propósito, crecimiento y reconocimiento para afianzar la permanencia.',
        motivo:
          'Un historial con muchos cambios de empresa sugiere mayor propensión a moverse.',
      };
    },
  },
];

const prioridadDeFactor = (f) => {
  if (f.critico) return PRIORIDAD_CRITICA;
  if (f.enRiesgo) return PRIORIDAD_ALTA;
  return PRIORIDAD_MEDIA;
};

/**
 * Devuelve las estrategias de retención sugeridas para un empleado a partir de
 * sus factores en riesgo. Si no hay factores en riesgo, devuelve una estrategia
 * de mantenimiento.
 *
 * @param {object} emp - registro de empleado (Prisma)
 * @returns {Array<{factorKey, titulo, descripcion, motivo, prioridad}>}
 */
const generarEstrategias = (emp) => {
  const enRiesgo = FACTORES
    .map((f) => {
      const r = f.evaluar(emp);
      if (r == null || !r.enRiesgo) return null;
      return { factorKey: f.key, ...r };
    })
    .filter(Boolean)
    // Críticos primero.
    .sort((a, b) => Number(b.critico) - Number(a.critico));

  if (enRiesgo.length === 0) {
    return [
      {
        factorKey: 'general',
        titulo: 'Mantener buenas prácticas de retención',
        descripcion:
          'Mantener las condiciones actuales, seguir con el seguimiento habitual y reconocer su buen desempeño.',
        motivo: 'No se detectaron factores de riesgo relevantes en este momento.',
        prioridad: PRIORIDAD_MEDIA,
      },
    ];
  }

  return enRiesgo.map((f) => ({
    factorKey: f.factorKey,
    titulo: f.titulo,
    descripcion: f.descripcion,
    motivo: f.motivo,
    prioridad: prioridadDeFactor(f),
  }));
};

module.exports = { FACTORES, generarEstrategias };
