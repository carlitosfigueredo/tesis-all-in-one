# Lean Canvas

Proyecto: Sistema de Inteligencia de Negocios basado en Machine Learning para la predicción de la fuga de talento y la optimización de estrategias de retención en empresas de desarrollo de software de Asunción, 2026.

> Documento elaborado a partir del código real del proyecto. Se distingue de forma explícita lo que ya está implementado de aquello que corresponde a características comerciales o de diseño aún no verificadas técnicamente.

---

## Problema

1. Las empresas de desarrollo de software de Asunción pierden talento (rotación de desarrolladores) y suelen enterarse cuando el colaborador ya renunció.
2. La detección de quién está por irse depende de la percepción del líder y no de datos objetivos.
3. Los datos de recursos humanos (salario, antigüedad, desempeño y clima laboral) no se cruzan para anticipar la fuga.

Alternativas existentes:

- Planillas de cálculo y revisión manual caso por caso.
- Encuestas de clima laboral esporádicas y sin seguimiento.
- Suites HRIS internacionales, en inglés y sin enfoque predictivo.
- Intuición del gerente o del líder técnico.

---

## Solución

Plataforma web SaaS multiempresa. Funcionalidades verificadas en el código:

- Centraliza los empleados de cada empresa, con datos aislados por empresa (`companyId`).
- Predice el riesgo de deserción de cada empleado mediante un modelo de Machine Learning (Random Forest, con scikit-learn), que devuelve una probabilidad (0 a 1), un nivel de riesgo (crítico, alto, medio o bajo) y una recomendación.
- Permite predicción individual y por lotes (`/api/predict` y `/api/predict/batch`).
- Ofrece importación masiva de empleados mediante archivos CSV.
- Presenta un panel con estadísticas e indicadores clave (`/api/employees/stats`).
- Controla el acceso mediante roles y permisos (RBAC): SUPER_ADMIN, COMPANY_ADMIN, ANALYST y VIEWER.

---

## Propuesta de Valor Única

«Anticipe la fuga de su talento: un sistema que, a partir de los datos de recursos humanos, predice qué colaboradores presentan mayor riesgo de renunciar e indica dónde actuar.»

- Valor diferencial: entrega un riesgo cuantificable por empleado, y no un simple registro de personal.
- Beneficios: permite priorizar los casos críticos, respaldar las decisiones de retención con evidencia y reducir el costo de reemplazo.

Concepto de alto nivel: funciona como un puntaje de riesgo, pero orientado a estimar la probabilidad de que un empleado renuncie.

---

## Ventaja Competitiva

- Producto en español, enfocado en el nicho de las empresas de desarrollo de software, a diferencia de un HRIS genérico.
- Diseño alineado con la Ley N.º 7593/2025 de Protección de Datos Personales, con registro de consentimiento informado incorporado desde el modelo de datos (entidad `ConsentRecord`).
- Modelo de datos adaptado al contexto local: salario en guaraníes, niveles de seniority y modalidad de trabajo presencial, híbrida o remota.

Aclaración: actualmente el modelo se entrena con el dataset IBM HR Analytics, de carácter genérico. Contar con un dataset local constituiría una ventaja real a futuro, pero aún no existe, por lo que no se presenta como diferencial.

---

## Segmentos de Clientes

- Empresas de desarrollo de software de Asunción (pequeñas y medianas).
- Usuarios dentro de cada empresa cliente:
  - Toma de decisiones: gerentes y responsables de recursos humanos (COMPANY_ADMIN).
  - Uso operativo: analistas (ANALYST).
  - Consulta: líderes de equipo (VIEWER).
- Administrador de la plataforma (SUPER_ADMIN).

Clientes pioneros: software factories medianas con una rotación de personal visible.

---

## Métricas Clave

- Número de empresas activas y suscripciones vigentes.
- Número de empleados cargados y de predicciones ejecutadas.
- Distribución de empleados por nivel de riesgo (crítico, alto, medio y bajo).
- Desempeño del modelo (AUC-ROC, que ya se calcula durante el entrenamiento).
- Tasa de renovación y retención de clientes.

---

## Canales

- Registro y contratación de planes desde el sitio web (`/api/auth/register` y `/api/plans`).
- Venta directa y demostraciones a empresas de software.
- Recomendaciones y difusión de boca en boca dentro de la comunidad tecnológica local.

---

## Estructura de Costos

- Costos fijos: alojamiento y servidor, base de datos PostgreSQL, dominio, mantenimiento y horas de desarrollo.
- Costos variables: comisión del procesador de pagos, consumo de infraestructura según el volumen de predicciones y soporte a clientes.

---

## Flujos de Ingresos

Suscripción mensual por planes (modelo SaaS), en guaraníes (valores tomados del archivo de datos iniciales del sistema):

- Plan Estándar — Gs. 449.000 por mes. Hasta 100 colaboradores, predicción mensual y panel básico.
- Plan Profesional — Gs. 899.000 por mes. Hasta 500 colaboradores, predicción semanal y panel avanzado.
- Plan Corporativo — Gs. 1.790.000 por mes. Hasta 1.500 colaboradores, predicción bajo demanda y panel personalizado.

El cobro de las suscripciones se realiza mediante dos pasarelas de pago integradas y activas: PayPal y AdamsPay.

---

## Aclaraciones para la defensa

- Pagos: el sistema integra dos pasarelas de pago activas, PayPal y AdamsPay, que dan soporte al cobro de las suscripciones.
- Frecuencia de predicción (mensual, semanal o bajo demanda): proviene de la descripción comercial de los planes. Constituye una característica ofrecida por cada plan y no necesariamente un proceso automático ya implementado (existe una tarea de expiración de suscripciones, pero no un programador de predicciones periódicas).
- El modelo de Machine Learning cuenta con un mecanismo heurístico de respaldo, por lo que la predicción responde incluso cuando el archivo del modelo entrenado (`model.pkl`) no está disponible.
