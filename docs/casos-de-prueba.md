# Casos de Prueba — Sistema BI de Retención de Talento

Este documento registra los casos de prueba de los requerimientos más importantes
del sistema: **5 requerimientos funcionales (RF)** y **5 no funcionales (RNF)**.

Cada caso está **automatizado** con Jest + Supertest en el backend y puede
ejecutarse a mano siguiendo la columna *Entrada*. La automatización corre sin
base de datos ni servicio de ML reales (se usan *mocks*), por lo que puede
ejecutarse en cualquier equipo.

## Cómo ejecutar las pruebas automatizadas

```bash
cd backend
npm install      # una sola vez (instala jest y supertest)
npm test         # ejecuta las 3 suites (24 casos)
```

Resultado esperado: `Test Suites: 3 passed`, `Tests: 24 passed`.

Archivos de prueba:

- `backend/tests/unit/recalcPolicy.test.js` — lógica pura de recálculo por plan (RF-05)
- `backend/tests/integration/auth.test.js` — autenticación y registro (RF-01, RF-02, RNF-02, RNF-03, RNF-04)
- `backend/tests/integration/employees.test.js` — empleados y predicción (RF-03, RF-04, RNF-01, RNF-02, RNF-05)

---

## Requerimientos Funcionales (RF)

| ID | Requerimiento funcional | Tipo de prueba | Entrada | Resultado esperado | Resultado obtenido | Comentarios |
|----|-------------------------|----------------|---------|--------------------|--------------------|-------------|
| CP-RF-01 | Login válido | Funcional | Usuario ingresa correo y contraseña válidos | El sistema permite el acceso, devuelve token JWT y datos del usuario (200) | Acceso exitoso, token generado | Automatizado: `auth.test.js › CP-RF-01`. Agregar evidencia (captura). |
| CP-RF-01b | Login inválido | Funcional | Correo válido + contraseña incorrecta | El sistema deniega el acceso (401) con mensaje "El correo o la contraseña no son correctos" | Acceso denegado (401) | Automatizado: `auth.test.js › CP-RF-01b`. |
| CP-RF-01c | Bloqueo por intentos fallidos | Funcional / Seguridad | 5 intentos de login con contraseña incorrecta | Al 5º intento la cuenta se bloquea 15 minutos (se guarda `lockedUntil`) | Cuenta bloqueada, `failedAttempts=5` | Automatizado: `auth.test.js › CP-RF-01c`. |
| CP-RF-02 | Registro de empresa con consentimiento | Funcional / Legal | Datos de empresa + usuario, **aceptando** Política de Privacidad y Términos | Crea empresa + usuario, asigna rol COMPANY_ADMIN y registra consentimientos (201). Ley N.º 7593/2025 | Empresa creada, consentimientos guardados | Automatizado: `auth.test.js › CP-RF-02b`. |
| CP-RF-02-neg | Registro sin consentimiento | Funcional / Legal | Datos válidos pero **sin aceptar** la Política de Privacidad | El sistema rechaza el registro (400) exigiendo aceptar la política | Registro rechazado (400) | Automatizado: `auth.test.js › CP-RF-02`. |
| CP-RF-03 | Validación de datos de empleado | Funcional | Alta de empleado con `edad = 15` (fuera del rango 18–65) | El sistema rechaza (400) con error de validación y no llama al modelo | Rechazado (400), empleado no creado | Automatizado: `employees.test.js › CP-RF-03`. |
| CP-RF-04 | Predicción de riesgo de deserción | Funcional / IA | Alta de empleado con datos válidos | Se calcula el riesgo vía servicio ML y se guardan `riesgo_desercion` y `nivel_riesgo` + snapshot de historial (201) | Empleado creado con riesgo 0.82 / CRÍTICO | Automatizado: `employees.test.js › CP-RF-04`. |
| CP-RF-05 | Recálculo según el plan | Funcional / Negocio | Empresa plan BÁSICO que recalculó hace 10 días intenta recalcular | El sistema bloquea el recálculo (frecuencia mensual) e informa cuántos días faltan | Bloqueado, faltan 20 días | Automatizado: `recalcPolicy.test.js` (BÁSICO mensual / PROFESIONAL semanal / CORPORATIVO bajo demanda). |

## Requerimientos No Funcionales (RNF)

| ID | Requerimiento no funcional | Tipo de prueba | Entrada | Resultado esperado | Resultado obtenido | Comentarios |
|----|----------------------------|----------------|---------|--------------------|--------------------|-------------|
| CP-RNF-01 | Aislamiento multi-tenant (seguridad) | Seguridad | Usuario de la empresa A consulta un empleado de la empresa B | El sistema responde 404 (no existe para él); la consulta se filtra por `companyId` | 404, filtro por empresa aplicado | Automatizado: `employees.test.js › CP-RNF-01`. |
| CP-RNF-02 | Control de acceso por permisos (RBAC) | Seguridad | Usuario **sin** permiso `employees.write` intenta crear un empleado | El sistema deniega la acción (403) | Acceso denegado (403) | Automatizado: `employees.test.js › CP-RNF-02`. También: sin token → 401 (`CP-RNF-02b`) y SUPER_ADMIN no entra por portal empresa (`auth.test.js › CP-RNF-02`). |
| CP-RNF-03 | Protección de datos personales | Seguridad / Privacidad | Login exitoso | La respuesta **nunca** incluye el hash de contraseña ni campos sensibles (`failedAttempts`, `lockedUntil`) | Respuesta sin datos sensibles | Automatizado: `auth.test.js › CP-RNF-03`. Contraseñas hasheadas con bcrypt. |
| CP-RNF-04 | Usabilidad — mensajes claros en español | Usabilidad | Login sin contraseña | El sistema responde 400 con mensaje en español y detalla el campo faltante | 400, "Revisá los datos ingresados", campo `password` | Automatizado: `auth.test.js › CP-RNF-04`. |
| CP-RNF-05 | Rendimiento / robustez de listados | Rendimiento | Listado de empleados con `page_size = 999` | El sistema acota el tamaño de página a 100 (protege la BD de consultas masivas) | `page_size = 100`, `take = 100` | Automatizado: `employees.test.js › CP-RNF-05`. |

---

## Plantilla para ejecución manual

Si se ejecuta un caso a mano (por ejemplo durante la defensa), usar esta ficha:

| Campo | Contenido |
|-------|-----------|
| ID del caso | (ej. CP-RF-01) |
| Requerimiento | (funcional / no funcional que valida) |
| Precondición | (estado previo: usuario existe, empresa activa, etc.) |
| Pasos | (acciones ejecutadas) |
| Datos de entrada | (valores usados) |
| Resultado esperado | (comportamiento correcto) |
| Resultado obtenido | (lo que ocurrió al ejecutar) |
| Estado | Aprobado / Fallido |
| Evidencia | (captura de pantalla / salida de consola) |

> Sugerencia: para la evidencia automatizada, correr `npm test` y adjuntar la
> captura de la salida donde figura `Tests: 24 passed, 24 total`.
