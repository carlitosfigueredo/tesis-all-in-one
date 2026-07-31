---
inclusion: always
---

# Frontend — Visualizacion y Dashboards BI (React)

## Stack de UI

- **Framework:** React + Vite
- **Estilos:** Tailwind CSS
- **Graficos:** Recharts
- **Notificaciones:** Toast component (portal, progress bar, 4 tipos)
- **Formularios:** PasswordInput, PasswordStrengthIndicator, AlertMessage

---

## Semaforo de Riesgo (4 niveles)

| Rango | Color | Nivel |
|---|---|---|
| 0.0 – 0.30 | Verde | BAJO |
| 0.30 – 0.50 | Amarillo | MEDIO |
| 0.50 – 0.75 | Rojo | ALTO |
| 0.75 – 1.0 | Rojo oscuro | CRITICO |

---

## Variables del tablero de empleados

Los campos del tablero se dividen en 3 categorias:

1. **Datos RRHH (la empresa carga):** rol, seniority, edad, modalidad, contrato, antiguedad, salario, horas extra, capacitacion, evaluacion, empresas anteriores
2. **Encuesta clima (la empresa carga, opcionales):** satisfaccion_laboral, satisfaccion_ambiente, equilibrio_vida_trabajo, estancamiento_carrera, feedback_lider
3. **Calculados por ML (el sistema predice):** riesgo_desercion, nivel_riesgo
4. **Historico:** desercion_real (si efectivamente se fue)

Solo `riesgo_desercion` y `nivel_riesgo` son calculados por el modelo. Todo lo demas es dato de entrada.

---

## Paginas principales del portal empresa

| Pagina | Ruta | Descripcion |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPIs, graficos de riesgo por area/seniority/modalidad |
| Empleados | `/employees` | Tabla con filtros, importar CSV, guia paso a paso |
| Detalle empleado | `/employees/:id` | Gauge de riesgo, datos laborales, indicadores clima |
| Modelo ML | `/model` | Metricas del modelo, feature importances, boton entrenar (solo CORPORATIVO) |
| Mi Empresa | `/company` | Info empresa, plan, usuarios, explicacion de campos (solo admin) |
| Mi Perfil | `/profile` | Cambio de contrasena con PasswordStrengthIndicator |
| Usuarios | `/users` | Crear/gestionar usuarios de la empresa (solo admin) |

---

## Componentes clave

| Componente | Archivo | Uso |
|------------|---------|-----|
| Toast | `components/Toast.jsx` | Notificaciones flotantes con portal, progress bar, auto-close |
| CsvImportGuide | `components/employees/CsvImportGuide.jsx` | Guia 4 pasos para importar CSV (campos, formato, validacion, prediccion) |
| PasswordInput | `components/PasswordInput.jsx` | Input con toggle de visibilidad |
| PasswordStrengthIndicator | `components/PasswordStrengthIndicator.jsx` | Barra de fuerza + checklist de reglas |
| AlertMessage | `components/AlertMessage.jsx` | Alerta inline con tipos, icono, animacion |
| Sidebar | `components/layout/Sidebar.jsx` | Menu lateral con links condicionales por rol (adminOnly) |

---

## Restricciones por rol en el frontend

- `adminOnly: true` en navItems del Sidebar: solo visible para COMPANY_ADMIN
- `isCompanyAdmin` y `isSuperAdmin` vienen del AuthContext via `useAuth()`
- `hasPermission('codigo')` para control granular
- PrivateRoute: verifica `mustChangePassword` → `companyStatus` → render normal

---

## Idioma

Todo texto visible en **espanol paraguayo**, tono directo. Sin acentos en codigo (comentarios, variables, etc.).

---

## Errores y feedback

- Login: Toast de error (no AlertMessage inline) para evitar que se pierda al redirigir
- Interceptor de Axios: NO redirige en rutas de auth (`/auth/login`, `/auth/register`, `/auth/me`, etc.)
- Formularios: Toast para errores del servidor, validacion inline para errores de formato

---

## Landing page

- Estilo: mismo gradiente del login (`from-primary-700 via-primary-600 to-primary-800`)
- Toggle dark/light mode en navbar (detecta preferencia del sistema)
- Secciones: hero con bullets, como funciona (3 pasos), caracteristicas, planes, CTA final
- Nombre: "Sistema BI" (no usar nombres inventados como RetainIQ)
