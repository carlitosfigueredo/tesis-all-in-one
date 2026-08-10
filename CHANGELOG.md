# Registro de cambios

## 2026-08-10

### Rediseño de Checkout y pantalla de comprobante

Se rediseño completamente la pagina de Checkout con una estetica mas premium y profesional manteniendo la identidad visual del sitio.

**Checkout:**
- Fondo gradient oscuro (primary-900 → gray-900) con header de branding
- Seleccion de plan con efecto glassmorphism (bg-white/10 + backdrop-blur)
- Tarjeta de pago blanca con sombra pronunciada y resumen visual del monto
- Pasos numerados (1. Seleccionar plan, 2. Completar pago)
- Badges de seguridad (SSL, Pago seguro, Activacion inmediata)

**Comprobante/Recibo:**
- Header dinamico: muestra "Pago aprobado via PayPal" o "via AdamsPay" segun el metodo real
- Formulario opcional de razon social y RUC para incluir en el PDF al imprimir
- Aviso explicito: "Este comprobante no constituye factura fiscal" con nota de evolucion futura
- Clases `print:hidden` en botones para PDFs limpios
- Fix: monto y vigencia ahora leen tanto `concept.amountGs` como `amount.value` (compatibilidad con estructura real del backend)

**Archivos modificados:**
- `frontend/src/pages/Checkout.jsx` — Reescrito completamente (ReceiptScreen + pantalla principal)
- `frontend/tailwind.config.js` — Paleta primary completa (50-950), `darkMode: 'class'`

---

### Dark mode completo

Se implemento dark mode en toda la aplicacion con toggle sol/luna en la Navbar, persistencia en localStorage, y deteccion de preferencia del sistema.

**Infraestructura:**
- `frontend/src/context/ThemeContext.jsx` — Contexto con toggle, persistencia, y deteccion de `prefers-color-scheme`
- `frontend/src/App.jsx` — Envuelto con ThemeProvider
- `frontend/src/index.css` — Base styles para `html.dark body`, fix de inputs dentro de contenedores blancos
- `frontend/tailwind.config.js` — `darkMode: 'class'`

**Paginas del dashboard:**
- Dashboard.jsx, Employees.jsx, EmployeeDetail.jsx, ModelML.jsx, Company.jsx, Users.jsx, Profile.jsx
- Patron: `bg-gray-50 dark:bg-gray-900` en containers, `bg-white dark:bg-gray-800` en cards, headings con `dark:text-gray-200`

**Paginas legales:**
- PrivacyPolicy.jsx, TermsAndConditions.jsx, Legal.jsx
- Header, footer, Section component, y badges adaptados

**Layout:**
- `frontend/src/components/layout/Navbar.jsx` — Toggle dark mode + clases dark en todos los elementos
- `frontend/src/components/layout/Sidebar.jsx` — Variantes dark

---

### Consentimiento y privacidad (Ley 7593/2025)

Se completo el flujo de consentimiento con banner de cookies, endpoints de consulta/revocacion, y gestion desde el perfil del usuario.

**Backend:**
- `backend/src/controllers/consent.controller.js` — GET /api/consent (mis consentimientos) y POST /api/consent/revoke (revocar)
- `backend/src/routes/consent.routes.js` — Rutas protegidas con auth + portal company
- `backend/src/routes/index.js` — Registro de consent routes

**Frontend:**
- `frontend/src/components/CookieConsent.jsx` — Banner informativo de cookies tecnicas con animacion slideUp, persistencia en localStorage
- `frontend/src/pages/Profile.jsx` — Seccion "Mis consentimientos": lista de consentimientos activos/revocados con boton de revocacion y advertencia
- `frontend/src/App.jsx` — CookieConsent integrado globalmente

---

### Panel Admin: Tasa de cambio PYG/USD

Se agrego la pagina de configuracion de tasa de cambio en el panel del super admin para ajustar la conversion que se usa al procesar pagos via PayPal.

**Frontend:**
- `frontend/src/pages/admin/AdminExchangeRates.jsx` — Input numerico con preview de conversion en vivo, validacion (1000-50000), toast de confirmacion
- `frontend/src/components/admin/AdminSidebar.jsx` — Link "Tasa de cambio" agregado
- `frontend/src/App.jsx` — Ruta /admin/settings/exchange-rates

**Nota:** El backend ya tenia los endpoints GET/PUT /api/admin/config/exchange-rates implementados. Solo faltaba la UI.

---

### Panel Admin: Pagos de todas las empresas

Se agrego la pagina de pagos globales en el panel del super admin con tabla paginada, filtros y KPIs.

**Frontend:**
- `frontend/src/pages/admin/AdminPayments.jsx` — Tabla con fecha, empresa, concepto, metodo, monto, estado, ID. KPIs rapidos (total, aprobados, recaudado). Filtros por estado y empresa. Paginacion.
- `frontend/src/components/admin/AdminSidebar.jsx` — Link "Pagos" agregado
- `frontend/src/App.jsx` — Ruta /admin/payments

---

### Mi Plan y Facturacion (pagina Mi Empresa)

Se agrego la seccion "Mi Plan y Facturacion" en la pagina Company.jsx del portal de empresas.

**Contenido:**
- 3 tarjetas: Plan actual (nombre + descripcion), Dias restantes (calculo en vivo desde currentPeriodEnd), Estado de suscripcion
- Tabla de historial de pagos: fecha, concepto, metodo, monto, estado (badge), link a recibo

**Archivos modificados:**
- `frontend/src/pages/Company.jsx` — Nuevo state `payments`, fetch de /payments/history, seccion visual completa con dark mode

---

## 2026-07-29

### Restriccion de entrenamiento por plan

El boton "Entrenar ahora" solo esta disponible para el plan CORPORATIVO (bajo demanda). Los planes Estandar y Profesional ven un mensaje indicando que las predicciones se actualizan mensual/semanalmente con opcion de upgrade.

**Archivos modificados:**
- `backend/src/middlewares/auth.middleware.js` — Se agrega `companyPlan` al objeto req.user
- `backend/src/controllers/auth.controller.js` — Se incluye `companyPlan` en respuesta de login/me/register
- `backend/src/routes/model.routes.js` — POST /api/model/train verifica plan antes de entrenar
- `backend/src/routes/predict.routes.js` — Actualizado import a predictDesercion
- `frontend/src/pages/ModelML.jsx` — Boton condicional: CORPORATIVO ve "Entrenar ahora", otros ven mensaje de upgrade con link a planes

---

### Migracion modelo Employee + Guia de carga CSV

Se migro el modelo Employee de PostgreSQL de los campos IBM HR a las nuevas variables custom. Se agrego una guia paso a paso en el frontend para que las empresas entiendan como cargar sus datos.

**Archivos modificados (Backend):**
- `backend/prisma/schema.prisma` — Modelo Employee reescrito con 12 campos RRHH obligatorios + 5 opcionales de encuesta clima + campos de prediccion (riesgo_desercion, nivel_riesgo)
- `backend/prisma/migrations/20260729120000_employee_new_variables/` — Migracion SQL que recrea la tabla employees con los nuevos campos
- `backend/prisma/seed.js` — Empleados de ejemplo actualizados con las nuevas variables
- `backend/src/controllers/employees.controller.js` — Reescrito: parseEmployeeRow() con validacion unificada, filtros por rol/seniority/modalidad, prediccion ML automatica al importar, endpoint /recalculate
- `backend/src/services/ml.service.js` — Reescrito: employeeToFeatures() mapper, calcularRiesgoEmpleado(), calcularRiesgoBatch() con fallback
- `backend/src/routes/employees.routes.js` — Agregada ruta POST /api/employees/recalculate

**Archivos nuevos (Frontend):**
- `frontend/src/components/employees/CsvImportGuide.jsx` — Componente de guia paso a paso (4 pasos: preparar datos, formato CSV, subir archivo, prediccion automatica). Incluye tabla con todos los campos, descarga de plantilla, explicacion de fuentes de datos.

**Archivos modificados (Frontend):**
- `frontend/src/pages/Employees.jsx` — Modal de importacion con boton "Guia paso a paso" integrado
- `frontend/public/plantilla_empleados.csv` — Plantilla actualizada con los 17 nuevos campos

**Datasets de prueba generados:**
- `ml-service/notebooks/data/empresas/technova_solutions_120.csv` (120 empleados)
- `ml-service/notebooks/data/empresas/guarani_code_85.csv` (85 empleados)
- `ml-service/notebooks/data/empresas/datapy_consulting_52.csv` (52 empleados)
- `ml-service/notebooks/data/empresas/appmakers_paraguay_345.csv` (345 empleados)
- `ml-service/notebooks/data/empresas/cloudsoft_saci_178.csv` (178 empleados)

**Motivo:** Las empresas necesitan cargar sus datos reales. Se migro la BD para aceptar las nuevas variables, se integro la prediccion ML automatica al importar, y se creo una guia visual para que cualquier usuario de RRHH entienda que datos subir y en que formato.

---

### Dataset y modelo ML: Migracion a variables custom para Paraguay

Se reemplazo el dataset IBM HR Analytics por un dataset sintetico custom enfocado en empresas de desarrollo de software de Asuncion, Paraguay. Todas las variables ahora estan en espanol, con escalas y rangos ajustados a la realidad local.

**Dataset nuevo:** `ml-service/notebooks/data/dataset_desercion_software_py.csv`
- 1000 registros sinteticos con correlaciones realistas
- 17 features + 1 target (desercion Si/No)
- Tasa de desercion: ~25%
- Variables divididas en: Datos RRHH (12 obligatorias) + Encuesta clima (5 opcionales)

**Variables del modelo (17):**
- Criticas: satisfaccion_laboral, equilibrio_vida_trabajo, estancamiento_carrera, salario_mensual
- Alta importancia: cantidad_horas_extra_mes, feedback_lider, capacitacion_ultimo_anio, antiguedad_meses
- Media: tipo_contrato, cantidad_empresas_anteriores, evaluacion_desempeno, satisfaccion_ambiente
- Baja: modalidad_trabajo, edad, nivel_formacion, rol_tecnologico, seniority

**Archivos modificados (ML Service):**
- `ml-service/schemas.py` — Nuevo schema EmployeeFeatures con Enums, validaciones, 5 variables opcionales con defaults neutros. PredictionResult con variables_faltantes y recomendacion.
- `ml-service/routers/training.py` — Nuevo DATASET_PATH, LabelEncoder para categoricas, se guardan encoders.pkl, 4 niveles de importancia (tier), modelo version 2.0.0.
- `ml-service/routers/predict.py` — Logica de variables opcionales (default=3), penalizacion de confianza, 4 niveles de riesgo (CRITICO/ALTO/MEDIO/BAJO), recomendaciones por nivel.
- `ml-service/routers/employees.py` — Reescrito para nuevo dataset. Stats por rol_tecnologico, seniority y modalidad.
- `ml-service/model/dummy_model.py` — Modelo heuristico actualizado con nuevas variables.

**Archivos modificados (Frontend):**
- `frontend/src/pages/ModelML.jsx` — 17 variables con descripcion, tier de importancia, fuente (RRHH/Encuesta clima), nota sobre variables opcionales.
- `frontend/src/pages/Employees.jsx` — Tabla con nuevas columnas (rol, seniority, modalidad, salario Gs., etc.), filtros actualizados, CSV import con nuevas validaciones.
- `frontend/src/pages/EmployeeDetail.jsx` — Detalle con datos laborales en Gs., indicadores clima escala 1-5, factores de riesgo actualizados, gauge con 4 niveles.

**Archivos nuevos:**
- `ml-service/notebooks/generar_dataset.py` — Script de generacion del dataset sintetico con correlaciones realistas.

**Motivo:** El dataset IBM HR (en ingles, con variables como DistanceFromHome y StockOptionLevel) no era representativo del contexto paraguayo. El nuevo dataset refleja la realidad de empresas de software locales, con salarios en guaranies, roles tecnologicos, y variables psicometricas de encuestas de clima.

---

## 2026-07-27

### frontend/src/pages/TermsAndConditions.jsx
- Se agrego la seccion 10 "Marco normativo" con las referencias a las leyes paraguayas que rigen el sistema:
  - Constitucion Nacional del Paraguay (1992) - Arts. 33 y 36
  - Ley N. 7593/2025 de Proteccion de Datos Personales - Arts. 5, 12 y 15
  - Ley N. 4439/2011 de Delitos Informaticos - Arts. 174 bis, 174 ter y 175
  - Ley N. 1328/1998 de Derechos de Autor y Derechos Conexos - Arts. 2, 7 y 67
- Se renumeraron las secciones 10 y 11 a 11 y 12 respectivamente.

### frontend/src/pages/Legal.jsx
- Se actualizo la referencia de la Ley N. 6534/2020 a la Ley N. 7593/2025 de Proteccion de Datos Personales (ley vigente).

### Eliminacion de datos mock — Conexion real a PostgreSQL via Prisma

**Archivos nuevos:**
- `backend/src/lib/prisma.js` — Singleton de PrismaClient (reutiliza instancia en desarrollo)
- `backend/prisma/seed.js` — Seed con super admin, empresa demo, usuarios de prueba, planes y empleados
- `backend/prisma/migrations/20260727221553_init/` — Migracion inicial con todas las tablas
- `backend/src/controllers/users.controller.js` — Controller CRUD de usuarios de empresa
- `backend/src/routes/users.routes.js` — Rutas GET/POST/PUT/PATCH para /api/users

**Archivos modificados:**
- `backend/prisma/schema.prisma` — Agregados modelos AuditLog, PlanConfig, PasswordResetToken. Campos failedAttempts y lockedUntil en User.
- `backend/package.json` — Agregada configuracion prisma.seed
- `backend/src/controllers/auth.controller.js` — Reescrito: login con bcrypt real, bloqueo por intentos fallidos, reset password persistido en BD
- `backend/src/middlewares/auth.middleware.js` — Reescrito: busca usuario en BD por JWT, verifica user.active
- `backend/src/controllers/admin.controller.js` — Reescrito: companies, planes y stats desde BD con Prisma queries
- `backend/src/controllers/employees.controller.js` — Reescrito: CRUD completo (create, update, delete, import) con Prisma, stats con aggregations
- `backend/src/services/audit.service.js` — Conectado a BD real (tabla audit_logs), ya no usa array en memoria
- `backend/src/routes/index.js` — Registrada nueva ruta /api/users
- `frontend/src/pages/Users.jsx` — Eliminado MOCK_USERS, ahora usa api.get/post/patch reales

**Motivo:** El sistema usaba datos hardcodeados en arrays para desarrollo. Se migro toda la capa de datos a PostgreSQL con Prisma ORM para preparar el sistema para uso real.

### Multi-tenant SaaS — Registro publico y control por estado de empresa

**Archivos nuevos:**
- `backend/prisma/migrations/20260727223200_add_company_status/` — Migracion: enum CompanyStatus + campo status en companies
- `backend/src/middlewares/companyStatus.middleware.js` — Middleware que bloquea acceso si empresa esta en PENDING_PAYMENT o SUSPENDED
- `frontend/src/pages/Register.jsx` — Wizard de 3 pasos para registrar empresa + admin
- `frontend/src/pages/PendingActivation.jsx` — Pantalla para empresas pendientes de pago

**Archivos modificados:**
- `backend/prisma/schema.prisma` — Enum CompanyStatus (PENDING_PAYMENT, TRIAL, ACTIVE, SUSPENDED), campo status en Company
- `backend/prisma/seed.js` — Empresa demo con status ACTIVE
- `backend/src/controllers/auth.controller.js` — Nuevo endpoint register, login/me devuelven companyStatus
- `backend/src/routes/auth.routes.js` — Ruta POST /api/auth/register
- `backend/src/schemas/auth.schema.js` — Schema Zod para validacion de registro
- `backend/src/routes/employees.routes.js` — Agregado requireActiveCompany
- `backend/src/routes/users.routes.js` — Agregado requireActiveCompany
- `backend/src/routes/model.routes.js` — Agregado requireActiveCompany
- `backend/src/routes/predict.routes.js` — Agregado requireActiveCompany
- `frontend/src/App.jsx` — Rutas /register y /users agregadas
- `frontend/src/pages/Login.jsx` — Link a registro, eliminadas credenciales hardcodeadas
- `frontend/src/routes/PrivateRoute.jsx` — Detecta companyStatus PENDING_PAYMENT y muestra pantalla de activacion

**Motivo:** Implementar flujo SaaS real: empresas se registran desde la landing, quedan en estado pendiente de pago, y solo acceden a los datos cuando se activan. Cada empresa tiene sus propios usuarios y empleados aislados.
