# Evidencia de Pruebas — Sistema BI de Predicción de Fuga de Talento

Este directorio contiene la **evidencia real** de la ejecución de las pruebas
funcionales (RF) y no funcionales (RNF) descritas en las Tablas 45 y 46 de la
tesis. La evidencia se generó ejecutando peticiones reales contra el sistema
desplegado en Docker (backend Node/Express, servicio ML FastAPI y PostgreSQL) y
consultando directamente la base de datos.

## Cómo ver los resultados

Las pruebas corren en **GitHub Actions** (workflow `Pruebas y evidencia (RF/RNF)`).
Cada ejecución produce:

- Un **resumen PASS/FAIL** en la página del run (pestaña *Actions* → *Summary*).
- Un **artifact descargable** `evidencia-pruebas` con:
  - `evidencia.html` — reporte visual (abrir en el navegador o imprimir a PDF).
  - `EVIDENCIA.txt` — log detallado (request/response), con credenciales enmascaradas.
  - `RESUMEN.md` — tabla de resultados en Markdown.
  - `resultados.json` — veredictos por prueba (para procesar).

## Archivos del repo

| Archivo | Contenido |
|---------|-----------|
| `scripts/ci_evidencia.py` | Ejecuta las 41 verificaciones RF/RNF y genera HTML + TXT + MD + JSON. Parametrizado por variables de entorno. |
| `scripts/train_demo.py` | Entrena el modelo ML de la empresa demo con un dataset sintético (con ruido, para métricas realistas). |

> Los scripts NO contienen credenciales: las leen de variables de entorno /
> GitHub Secrets. El log de evidencia no se versiona (se genera como artifact).

## Secrets requeridos (Settings → Secrets and variables → Actions)

| Secret | Descripción |
|--------|-------------|
| `CI_JWT_SECRET` | Secret para firmar los JWT en el entorno de CI. |
| `SEED_SUPERADMIN_EMAIL` | Email del superadmin demo. |
| `SEED_SUPERADMIN_PASSWORD` | Contraseña del superadmin demo. |
| `SEED_COMPANY_PASSWORD` | Contraseña de las cuentas demo (admin/analista/viewer). |
| `TEST_USER_PASSWORD` | Contraseña de las cuentas creadas durante las pruebas. |
| `SEED_ADMIN_EMAIL` / `SEED_ANALYST_EMAIL` / `SEED_VIEWER_EMAIL` | (Opcional) emails demo; si no se definen se usan los de ejemplo. |
| `CI_PG_USER` / `CI_PG_PASSWORD` / `CI_PG_DB` | (Opcional) credenciales de la BD efímera del runner. |

## Entorno de ejecución

- **Backend de datos**: `http://localhost:4001` — instancia de evidencia que corre
  el **mismo código** y apunta a la **misma base de datos** del despliegue. La
  única diferencia con producción es que tiene reCAPTCHA desactivado (modo
  desarrollo soportado por el propio código: cuando `RECAPTCHA_SECRET_KEY` está
  vacía, el middleware hace *pass-through*), lo que permite automatizar los
  logins. El rate limiting se desactivó **solo en esta instancia** para no
  interferir con las demás pruebas.
- **Backend de producción**: `http://localhost:4000` — con reCAPTCHA y rate
  limiting activos. La prueba **RNF-020 (rate limiting)** se ejecutó contra esta
  instancia para evidenciar el comportamiento real de producción.
- **Servicio ML**: `http://localhost:8000` (FastAPI + scikit-learn, RandomForest).
- **Base de datos**: PostgreSQL 16 (`tesis_postgres`), consultada con `psql`.

## Cómo reproducir

La forma recomendada de ejecutarlas es **disparar el workflow en GitHub**
(Actions → *Pruebas y evidencia (RF/RNF)* → *Run workflow*). Para correrlas de
forma local:

```bash
# 1. Definir las credenciales por entorno (nunca hardcodear)
export SEED_SUPERADMIN_EMAIL="superadmin@tu-dominio.local"
export SEED_SUPERADMIN_PASSWORD="..."      # tu eleccion
export SEED_COMPANY_PASSWORD="..."         # tu eleccion
export TEST_USER_PASSWORD="..."            # tu eleccion
export JWT_SECRET="..."                    # el mismo que use el backend

# 2. Levantar el stack (toma las mismas variables de tu .env)
docker compose up -d

# 3. Seed + entrenamiento del modelo demo
docker exec tesis_backend node prisma/seed.js
python3 docs/evidencias-pruebas/scripts/train_demo.py

# 4. Generar la evidencia (usa las variables de entorno para autenticarse)
export BACKEND_URL="http://localhost:4000" ML_URL="http://localhost:8000"
export PGHOST=localhost PGPORT=5432 PGUSER=tesis_user PGDATABASE=tesis_bi_db
export PGPASSWORD="$POSTGRES_PASSWORD" OUTDIR="./evidencia-out"
python3 docs/evidencias-pruebas/scripts/ci_evidencia.py
# -> genera evidencia.html, EVIDENCIA.txt, RESUMEN.md, resultados.json
```

> Requiere que el backend corra con `RECAPTCHA_SECRET_KEY` vacío para poder
> automatizar los logins (modo dev soportado por el código).

---

## Resultado de las pruebas funcionales (RF)

| ID | Prueba | HTTP / Resultado real | Estado |
|----|--------|-----------------------|--------|
| RF-001 | Ingesta estructurada (import de filas) | 201, 5 creados, resumen correcto | ✅ |
| RF-002 | Validación por fila (5 inválidas) | 400, 5 errores por línea con campo y motivo | ✅ |
| RF-003 | Pipeline ETL / preprocesamiento | 200, encoders aplicados a 6 categóricas | ✅ |
| RF-004 | Datos faltantes (imputación + penalización) | 200, `variables_faltantes` (5) y confianza 0.575 | ✅ |
| RF-005 | Codificación de categóricas | 422 valida el catálogo; fallback a 0 demostrado | ✅ |
| RF-006 | Persistencia en PostgreSQL | 201 + verificación directa en BD (id UUID + riesgo) | ✅ |
| RF-007 | Entrenamiento del modelo (métricas) | AUC-ROC=0.84, accuracy=0.875, F1=0.87 | ✅ |
| RF-008 | Probabilidad de deserción | 200, riesgo=0.7518, CRITICO, confianza, versión | ✅ |
| RF-009 | Clasificación por niveles (umbrales) | CRITICO/ALTO/MEDIO/BAJO según umbral | ✅ |
| RF-010 | Recomendaciones por nivel | Texto contextual para nivel CRÍTICO | ✅ |
| RF-011 | Dashboard BI (KPIs) | 200, KPIs + distribución para gráficos | ✅ |
| RF-012 | Filtrado dinámico | 200, filtra por nivel_riesgo y pagina | ✅ |
| RF-013 | Predicción en lote (recalculate) | 200, actualiza todos + audit | ✅ |
| RF-014 | Registro multi-tenant | 201, Company PENDING_PAYMENT + admin + 2 consents | ✅ |
| RF-015 | Ciclo de vida de usuarios | 201 (mustChangePassword) + desactivación + login 401 | ✅ |
| RF-016 | Autenticación JWT | 200, payload con roles/companyId, exp 8h | ✅ |
| RF-017 | RBAC (VIEWER → POST empleados) | 403 "No tenés permiso…" | ✅ |
| RF-018 | Pagos PayPal (crear orden) | Integración real; requiere credenciales de prod (ver nota) | ⚠️ |
| RF-019 | Procesamiento de pago + activación | 200 APPROVED → empresa ACTIVE + suscripción | ✅ |
| RF-020 | Límite de empleados por plan | 403 `EMPLOYEE_LIMIT_REACHED` al superar el cupo | ✅ |
| RF-021 | Panel admin global | 200, empresa → SUSPENDED + audit | ✅ |
| RF-022 | Registro de auditoría | `EMPLOYEE_CREATED` con newValue e IP | ✅ |
| RF-023 | Consentimiento informado | 2 consents (PRIVACY_POLICY, TERMS) v1.0, IP | ✅ |
| RF-024 | Recuperación de contraseña | 200 genérico; token hasheado (SHA-256) en BD | ✅ |
| RF-025 | Estado del modelo ML | 200, métricas + importancias + matriz de confusión | ✅ |
| RF-026 | Exportación de reportes (CSV) | 200, CSV con headers, filtro y `Content-Disposition` | ✅ |
| RF-027 | Trazabilidad histórica | 200, snapshots de riesgo por empleado | ✅ |

## Resultado de las pruebas no funcionales (RNF)

| ID | Prueba | Resultado real | Estado |
|----|--------|----------------|--------|
| RNF-001 | Cifrado en tránsito (HTTPS) | Se valida a nivel de infraestructura (nginx/TLS); ver nota | ℹ️ |
| RNF-002 | Cifrado en reposo | Password = hash bcrypt `$2a$12$…` (60 chars) | ✅ |
| RNF-003 | Integridad transaccional (FK) | Error `employees_companyId_fkey` (FK violation) | ✅ |
| RNF-004 | Contenerización | 5 contenedores corriendo (front, back, ml, postgres, mailhog) | ✅ |
| RNF-005 | Rendimiento batch | 5.000 predicciones en 6.85 s (límite < 90 s) | ✅ |
| RNF-006 | Latencia API REST | Listado 9 ms, stats 15 ms (límite < 1 s) | ✅ |
| RNF-007 | Rendimiento UI (Lighthouse) | Requiere medición manual con Lighthouse; ver nota | ℹ️ |
| RNF-008 | Diseño responsivo | Requiere verificación visual en navegador; ver nota | ℹ️ |
| RNF-009 | Compatibilidad navegadores | Requiere verificación manual multi-navegador; ver nota | ℹ️ |
| RNF-010 | Seguridad HTTP (Helmet) | Headers: X-Content-Type-Options, X-Frame-Options, HSTS | ✅ |
| RNF-011 | Registro centralizado de errores | audit_log con acciones `*_FAILED` / status FAILURE | ✅ |
| RNF-012 | Auditoría de accesos | `LOGIN_SUCCESS` / `LOGIN_FAILED` registrados | ✅ |
| RNF-013 | Protección contra bots (reCAPTCHA) | Activo en prod (:4000); ver nota | ✅ |
| RNF-014 | Bloqueo automático de cuentas | 5 intentos → `lockedUntil` (código verificado) | ✅ |
| RNF-015 | Validación de inputs (Zod) | 400 con `errors[{field,message}]` en español | ✅ |
| RNF-016 | Arquitectura de microservicios | ML como servicio interno; backend actúa de proxy | ✅ |
| RNF-017 | Privacidad (Ley 7593/2025) | 400 al registrar sin aceptar la política | ✅ |
| RNF-018 | Multi-tenancy | 404 al pedir un empleado ajeno (no revela existencia) | ✅ |
| RNF-019 | Degradación elegante ML | Con ML caído: alta OK con riesgo 0 / BAJO (fallback) | ✅ |
| RNF-020 | Rate limiting | Request 6 → HTTP 429, `Retry-After: 900` | ✅ |

---

## Notas y aclaraciones (integridad de la evidencia)

Durante la generación de evidencia se detectó que **tres funcionalidades de las
tablas no estaban implementadas** en el código. Se implementaron para que la
evidencia fuera genuina (ver `CHANGELOG` / commits):

1. **RF-020 — Límite de empleados por plan**: se agregó
   `src/services/planLimit.service.js` y el enforcement en `createEmployee` e
   `importEmployees` (403 `EMPLOYEE_LIMIT_REACHED`).
2. **RF-026 — Exportación CSV**: se agregó el endpoint
   `GET /api/employees/export/csv` (con filtros y auditoría).
3. **RNF-020 — Rate limiting**: se agregó `src/middlewares/rateLimit.middleware.js`
   (`express-rate-limit`, 5 req/15 min en endpoints de auth) y se aplicó en
   `auth.routes.js`. También se hizo explícito el header **HSTS** en Helmet.

### Pruebas que requieren verificación fuera de este script

- **RNF-001 (HTTPS), RNF-007 (Lighthouse), RNF-008 (responsivo), RNF-009
  (navegadores)**: son pruebas de infraestructura/UI que se validan con
  herramientas externas (navegador, Lighthouse, `openssl`), no vía API. La
  redirección HTTPS y TLS se configuran en el reverse proxy del despliegue.
- **RF-018 (PayPal)**: la integración con PayPal (Orders API v2) está
  implementada, pero requiere `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` de una
  cuenta de sandbox/producción. En el entorno de evidencia esas claves no están
  cargadas, por lo que el endpoint responde de forma controlada. El **flujo
  completo de pago y activación de empresa** sí se evidencia en RF-019 mediante
  el simulador de tarjetas (mock de desarrollo con la tarjeta de prueba 4242…).
- **RF-019 (AdamsPay)**: análogamente, AdamsPay requiere `ADAMSPAY_API_KEY`.

### Sobre el modelo ML

El modelo de la empresa demo se entrenó con un **dataset sintético** (120
registros con ruido de etiqueta ~15 %) para obtener métricas realistas
(AUC≈0.84). En un despliegue real, cada empresa entrena su modelo con sus propios
empleados y su columna de deserción real.
