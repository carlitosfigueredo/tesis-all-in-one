---
inclusion: always
---

# Roadmap y Estado del Proyecto

Tesis: **Diseno e Implementacion de un Sistema de Inteligencia de Negocios basado en Machine Learning para la Prediccion de la Fuga de Talento y la Optimizacion de Estrategias de Retencion en Empresas de Desarrollo de Software de Asuncion, 2026.**

Stack: React + Vite + Tailwind / Node.js + Express + Prisma / PostgreSQL / FastAPI (ML) / Docker

---

## Estado actual del sistema (30 julio 2026)

### Modulos completados

| Modulo | Estado |
|--------|--------|
| Docker multi-servicio | backend, frontend, postgres, ml-service, mailhog |
| Landing page | Estilo gradiente primary, toggle dark/light, hero + planes + CTA |
| Registro empresas | `/register` wizard → Company + COMPANY_ADMIN |
| Pasarela de pago mock | Tarjetas de prueba, checkout, suscripcion |
| Login empresas | bcrypt, bloqueo 5 intentos, reCAPTCHA v2, Toast de errores |
| Login SUPER_ADMIN | Portal admin separado |
| RBAC completo | Roles (SUPER_ADMIN, COMPANY_ADMIN, ANALYST, VIEWER) + Permisos granulares |
| Cambio de contrasena | Primer login obligatorio (mustChangePassword), perfil personal |
| Politica de contrasena | NIST/OWASP, PasswordStrengthIndicator, validatePasswordPolicy |
| Panel SUPER_ADMIN | Dashboard, companies, plans, audit-logs |
| CRUD empleados | Nuevas variables (desercion PY), prediccion ML automatica al importar |
| Importacion CSV | Validacion, guia paso a paso (CsvImportGuide), plantilla descargable |
| Filtros empleados | rol_tecnologico, seniority, modalidad, nivel_riesgo, paginacion |
| Dashboard empresa | KPIs, riesgo por area/seniority/modalidad |
| Pagina Mi Empresa | Info empresa, plan, usuarios, explicacion de campos |
| Modelo ML (pagina) | Metricas, feature importances con tiers, restriccion por plan |
| Perfil usuario | Cambio de contrasena con PasswordInput + PasswordStrengthIndicator |
| Dataset custom | 1000 registros, 17 features + target, contexto Paraguay |
| 5 datasets prueba | Empresas simuladas (52-345 empleados) para testing |
| Recalcular predicciones | Endpoint POST /employees/recalculate |
| Correos transaccionales | Reset, password-changed, account-locked (Mailhog) |
| Auditoria | Toda accion en audit_logs |
| Toast component | Portal, progress bar, auto-close, 4 tipos |

---

## Arquitectura de portales

```
/                    → Landing (publico, toggle dark/light)
/register            → Registro de empresa
/login               → Portal empresa
/checkout            → Pago de suscripcion
/admin/login         → Portal admin (SUPER_ADMIN)
/forgot-password     → Recuperar contrasena
/reset-password      → Resetear contrasena
/terms               → Terminos y condiciones
/legal               → Aviso legal
/dashboard           → Dashboard empresa (protegido)
/employees           → Listado empleados con nuevas variables
/employees/:id       → Detalle empleado (clima, riesgo, gauge)
/users               → Gestion usuarios empresa
/model               → Modelo ML (metricas, entrenar)
/company             → Mi Empresa (info, plan, usuarios, explicacion campos)
/profile             → Mi Perfil (cambio de contrasena)
/admin/dashboard     → Dashboard admin
/admin/companies     → Empresas cliente
/admin/plans         → Planes y precios
/admin/audit         → Auditoria del sistema
```

---

## Flujo de datos (empresa → prediccion)

```
Empresa se registra → Paga → Se activa → Carga CSV de empleados
    ↓
Backend valida datos → Llama al ML service (batch)
    ↓
ML service predice riesgo_desercion + nivel_riesgo para cada empleado
    ↓
Se guardan en BD → Se muestran en Dashboard/Tabla/Detalle
```

---

## Variables del modelo vs campos de la BD

| Fuente | Campos | Quien los carga |
|--------|--------|-----------------|
| Datos RRHH (obligatorios) | edad, nivel_formacion, rol_tecnologico, seniority, antiguedad_meses, modalidad_trabajo, tipo_contrato, salario_mensual, cantidad_horas_extra_mes, capacitacion_ultimo_anio, evaluacion_desempeno, cantidad_empresas_anteriores | La empresa (CSV o manual) |
| Encuesta clima (opcionales) | satisfaccion_laboral, satisfaccion_ambiente, equilibrio_vida_trabajo, estancamiento_carrera, feedback_lider | La empresa (encuesta interna) |
| Prediccion ML (calculado) | riesgo_desercion, nivel_riesgo | El sistema automaticamente |
| Historico | desercion_real | Solo para validacion |

---

## Restricciones por plan

| Funcionalidad | BASICO | PROFESIONAL | CORPORATIVO |
|--------------|--------|-------------|-------------|
| Empleados max | 100 | 500 | 1500 |
| Frecuencia prediccion | Mensual | Semanal | Bajo demanda |
| Boton "Entrenar ahora" | No | No | Si |
| Dashboard | Basico | Avanzado | Personalizado |
| Importacion CSV | Si | Si (masiva) | Si (masiva) |

---

## Componentes reutilizables del frontend

| Componente | Descripcion |
|------------|-------------|
| `PasswordInput` | Input con toggle visibilidad (ojito) |
| `PasswordStrengthIndicator` | Barra + checklist de requisitos |
| `Toast` | Notificacion portal con progress bar, 4 tipos, auto-close |
| `AlertMessage` | Alerta inline con icono, animacion, boton cerrar |
| `CsvImportGuide` | Guia paso a paso (4 pasos) para importar CSV |
| `Sidebar` | Menu lateral con links condicionales por rol |
| `Navbar` | Barra superior con titulo |

---

## Credenciales de desarrollo (seed)

| Portal | Email | Contrasena | Rol |
|--------|-------|------------|-----|
| `/admin/login` | carlosalberto...@gmail.com | Admin2025! | SUPER_ADMIN |
| `/login` | admin@empresa.com | Demo2025! | COMPANY_ADMIN |
| `/login` | analista@empresa.com | Demo2025! | ANALYST |
| `/login` | viewer@empresa.com | Demo2025! | VIEWER |

---

## Docker

- `docker compose up --build -d` levanta todo
- `ML_SERVICE_URL=http://ml-service:8000` en .env para comunicacion interna
- Backend ejecuta `prisma generate` + `prisma migrate deploy` al arrancar
- Volumen hot-reload: `./backend/src` y `./frontend/src` montados
- Mailhog en `http://localhost:8025`
