# Matriz de Trazabilidad

La matriz de trazabilidad garantiza la cobertura completa del proyecto vinculando la cadena de valor: desde el **problema** identificado, pasando por los **objetivos** planteados, los **requerimientos** derivados, los **artefactos de diseño** que los materializan, hasta las **pruebas** que los validan. Esto asegura que ningún objetivo quede sin implementar y ninguna funcionalidad sea injustificada.

---

## Cadena de Trazabilidad: Problema → Objetivos → Requerimientos → Diseño → Pruebas

|Problema|Objetivo|Requerimiento|Diseño (Artefacto)|Prueba|
|--------|--------|-------------|------------------|------|
|La rotación de talento en empresas de software se gestiona de forma reactiva, sin datos históricos estructurados.|Centralizar y estructurar los datos de empleados para su análisis.|RF-001, RF-002, RF-006|CU-010, act-importar-csv, Tabla employees, Prisma Schema|P-001, P-002, P-006|
|Los datos de RRHH suelen estar incompletos o en formatos inconsistentes (Garbage in, Garbage out).|Garantizar la calidad de los datos antes del análisis predictivo.|RF-003, RF-004, RF-005|Pipeline ETL (ml-service), Preprocesador|P-003, P-004, P-005|
|No existe una herramienta que prediga cuantitativamente el riesgo de fuga de un colaborador tecnológico.|Desarrollar un modelo de ML que calcule la probabilidad de deserción.|RF-007, RF-008, RF-009|CU-011, CU-012, CU-013, seq-prediccion-individual, comp-ml, Modelo Random Forest|P-007, P-008, P-009, P-025|
|La gerencia carece de guías accionables sobre cómo retener a los empleados en riesgo.|Generar recomendaciones automatizadas de estrategias de retención.|RF-010|seq-prediccion-individual, ML Service (recomendaciones)|P-010|
|La toma de decisiones se basa en intuición, sin visualización clara de indicadores.|Proveer un dashboard de BI con indicadores clave y análisis segmentado.|RF-011, RF-012, RF-013|CU-014, Dashboard.jsx, comp-frontend, Tabla employees|P-011, P-012, P-013|
|Las empresas necesitan un modelo de acceso comercial sostenible y seguro.|Implementar un sistema SaaS multi-tenant con suscripciones y pagos.|RF-014, RF-018, RF-019, RF-020|CU-005, CU-018, CU-019, seq-pago-paypal, seq-pago-adamspay, Tablas companies/payments/subscriptions|P-014, P-018, P-019, P-020|
|El acceso a datos laborales sensibles requiere control estricto de permisos.|Implementar autenticación y control de acceso basado en roles.|RF-015, RF-016, RF-017|CU-001, CU-015, CU-017, seq-login-exitoso, act-login, cls-rbac, Tablas users/roles/permissions|P-015, P-016, P-017|
|Se requiere trazabilidad de acciones y cumplimiento legal (Ley 7593/2025).|Registrar auditoría de acciones y consentimiento informado.|RF-022, RF-023|CU-006, cls-seguridad, Tablas audit_logs/consent_records|P-022, P-023|
|La administración de la plataforma requiere gestión centralizada.|Proveer un panel de administración global para el operador.|RF-021|CU-022 a CU-026, comp-backend (Admin Controller)|P-021|
|Los usuarios pueden olvidar sus credenciales o requerir recuperación segura.|Implementar recuperación de contraseña con tokens seguros.|RF-024|CU-003, CU-004, Tabla password_reset_tokens|P-024|
|La gerencia necesita distribuir los análisis fuera de la plataforma.|Permitir exportación de reportes en formatos portables.|RF-026|Export Controller, Tabla employees|P-026|
|Se requiere observar la evolución del riesgo a lo largo del tiempo.|Almacenar y consultar el histórico de predicciones.|RF-027|Employees Controller (trend), Tabla prediction_snapshots|P-027|

---

## Trazabilidad de Requerimientos No Funcionales

|Preocupación (Problema)|Objetivo de Calidad|Requerimiento|Diseño (Mecanismo)|Prueba|
|-----------------------|-------------------|-------------|------------------|------|
|Los datos sensibles pueden ser interceptados en tránsito.|Proteger la confidencialidad de las comunicaciones.|RNF-001, RNF-002|HTTPS/TLS, bcrypt, SHA-256|P-NF01, P-NF02|
|La integridad de los datos debe garantizarse.|Prevenir datos huérfanos o malformados.|RNF-003, RNF-015|Prisma (FK, UNIQUE), Zod|P-NF03, P-NF15|
|El sistema debe ser portable y reproducible.|Garantizar paridad entre entornos.|RNF-004, RNF-016|Docker Compose, microservicios|P-NF04, P-NF16|
|El análisis de grandes volúmenes no debe saturar la infraestructura.|Cumplir métricas de rendimiento.|RNF-005, RNF-006, RNF-007|Batch processing, índices, code splitting|P-NF05, P-NF06, P-NF07|
|La interfaz debe ser usable en distintos dispositivos y navegadores.|Garantizar accesibilidad y compatibilidad.|RNF-008, RNF-009|Tailwind responsive, polyfills|P-NF08, P-NF09|
|El sistema debe resistir ataques y accesos no autorizados.|Reforzar la seguridad perimetral.|RNF-010, RNF-013, RNF-014, RNF-020|Helmet, reCAPTCHA, bloqueo de cuenta, rate limiting|P-NF10, P-NF13, P-NF14, P-NF20|
|Deben registrarse las operaciones para auditoría y diagnóstico.|Asegurar trazabilidad y monitoreo.|RNF-011, RNF-012|Error handler, Audit Service|P-NF11, P-NF12|
|Los datos de una empresa no deben ser visibles por otra.|Garantizar aislamiento multi-tenant.|RNF-018|Filtro companyId en cada query|P-NF18|
|El cumplimiento de la Ley 7593/2025 es obligatorio.|Proteger datos personales por diseño.|RNF-017|Consentimiento con trazabilidad|P-NF17|
|Una falla del servicio ML no debe caer todo el sistema.|Garantizar resiliencia operativa.|RNF-019|Degradación elegante (fallback)|P-NF19|

---

## Cobertura de la Cadena de Trazabilidad

|Eslabón|Cantidad|Estado|
|-------|--------|------|
|Problemas identificados|12|Todos con objetivo asociado|
|Objetivos derivados|12|Todos con requerimientos|
|Requerimientos funcionales|27|Todos con diseño y prueba|
|Requerimientos no funcionales|20|Todos con diseño y prueba|
|Casos de uso|26|Vinculados a requerimientos|
|Pruebas de validación|47|100% de requerimientos cubiertos|

**Conclusión:** La cadena Problema → Objetivos → Requerimientos → Diseño → Pruebas está completa y sin eslabones huérfanos. Cada problema del contexto tiene un objetivo que lo aborda, cada objetivo se traduce en requerimientos concretos, cada requerimiento se materializa en artefactos de diseño y se valida mediante pruebas específicas.
