---
inclusion: always
---

# Roadmap y Estado del Proyecto

Tesis: **Diseño e Implementación de un Sistema de Inteligencia de Negocios basado en Machine Learning para la Predicción de la Fuga de Talento y la Optimización de Estrategias de Retención en Empresas de Desarrollo de Software de Asunción, 2026.**

Stack: React + Vite + Tailwind / Node.js + Express + Prisma / PostgreSQL / FastAPI (ML) / Docker

---

## Estado actual del sistema (julio 2026)

### ✅ Completado

| Módulo | Descripción |
|---|---|
| Infraestructura Docker | docker-compose con backend, frontend, postgres, ml-service, **mailhog** |
| Landing page pública | `/` con hero, 3 planes (Básico/Profesional/Empresarial), footer, responsive |
| Términos y condiciones | `/terms` accesible sin auth |
| Aviso legal | `/legal` accesible sin auth |
| Dos portales de login | `/login` (empresas) y `/admin/login` (SUPER_ADMIN) con JWT separados |
| Sistema de roles | `SUPER_ADMIN`, `COMPANY_ADMIN`, `ANALYST`, `VIEWER` |
| Panel SUPER_ADMIN | `/admin/dashboard`, `/admin/companies`, `/admin/plans`, `/admin/audit` |
| **Políticas de contraseña** | `validatePasswordPolicy()` con reglas NIST/OWASP, `getPasswordStrength()` |
| **Validación Zod** | Schemas para login, forgot-password, reset-password con middleware `validate()` |
| **PasswordStrengthIndicator** | Componente frontend con barra de progreso + checklist en tiempo real |
| **Servicio de correos** | Nodemailer + Mailhog, templates HTML: reset-password, password-changed, account-locked |
| **Restaurar contraseña** | Flujo completo: token SHA-256 + TTL 5min → correo → reset → confirmación |
| **Auditoría completa** | `logAction()` en login, forgot/reset password, empleados (view, import, filter) |
| **auditMiddleware** | Middleware automático para CRUD: intercepta respuesta y loguea si exitoso |
| **Panel de auditoría** | `/admin/audit` con filtros (acción, estado, userId, fechas), paginación, filas expandibles |
| Dashboard de empresas | KPIs retención, gráficos riesgo, toggle USD/Gs, badge con nombre de empresa |
| Gestión de empleados | Listado, búsqueda, paginación, detalle con toggle moneda |
| **Satisfacción mejorada** | Escala 1-4 con etiquetas verbales, colores semáforo y hints por indicador |
| **Validación CSV ampliada** | Valida overtime/attrition (Yes/No), business_travel, education (1-5), todos los campos 1-4 |
| Importación CSV | Modal con preview, tabla de ejemplo, botón de importar con auditoría |
| ML Service (FastAPI) | Predicción de fuga con modelo Random Forest |
| Schema Prisma | Company, User (roles), Employee, PasswordReset, AuditLog |
| Steerings Kiro | 9 archivos: seguridad, correos, auditoría, base-de-datos, ml-service, devops, frontend-bi, backend-etl, roadmap-estado |

---

## 🔜 Pendiente (próximos pasos)

### Bloque 4 — Conexión real con BD (cuando se corra `prisma migrate dev`)
- Reemplazar mocks en memoria por queries Prisma reales
- `auth.controller.js`: leer usuarios de tabla `users`, bcrypt.compare real
- `employees.controller.js`: CRUD real contra tabla `employees` filtrado por `companyId`
- `audit.service.js`: escribir en tabla `audit_logs` (descomentar bloque Prisma)
- `admin.controller.js`: leer de tablas `companies` y `users`
- Migraciones: `npx prisma migrate dev --name init`

### Bloque 5 — Funcionalidades adicionales
- Registro de nuevas empresas (onboarding de tenant)
- Gestión de usuarios por empresa (COMPANY_ADMIN puede crear ANALYST/VIEWER)
- Perfil de usuario con cambio de contraseña desde el dashboard
- Exportación de empleados a CSV desde el listado
- Gráfico de tendencia histórica de riesgo en el dashboard

### Bloque 6 — ML avanzado
- Reentrenamiento del modelo desde el panel admin
- Predicción en batch para todos los empleados de una empresa
- Variables adicionales: `contextSwitchingScore`, `timeUnderSameManager`

---

## Arquitectura de portales

```
/                    → Landing (público)
/login               → Portal empresa  (COMPANY_ADMIN / ANALYST / VIEWER)
/admin/login         → Portal admin    (SUPER_ADMIN)
/forgot-password     → Recuperar contraseña (público)
/reset-password      → Resetear contraseña (público, token requerido)
/terms               → Términos y condiciones (público)
/legal               → Aviso legal (público)
/dashboard           → Dashboard empresa (protegido, empresa)
/employees           → Listado empleados (protegido, empresa)
/employees/:id       → Detalle empleado (protegido, empresa)
/model               → Modelo ML (protegido, empresa)
/admin/dashboard     → Dashboard admin (protegido, SUPER_ADMIN)
/admin/companies     → Empresas cliente (protegido, SUPER_ADMIN)
/admin/plans         → Planes y precios (protegido, SUPER_ADMIN)
/admin/audit         → Auditoría del sistema (protegido, SUPER_ADMIN)
```

---

## Credenciales de desarrollo (mock, sin DB real)

| Portal | Email | Contraseña | Rol |
|---|---|---|---|
| `/admin/login` | superadmin@sistemabi.edu.py | admin123 | SUPER_ADMIN |
| `/login` | admin@empresa.com | admin123 | COMPANY_ADMIN |
| `/login` | analista@empresa.com | admin123 | ANALYST |
| `/login` | viewer@empresa.com | admin123 | VIEWER |

---

## Notas técnicas para continuar en próximas sesiones

- **Modo mock activo**: auth y employees usan datos hardcodeados mientras no haya BD conectada. Para activar Prisma: correr `docker-compose up --build`, luego `npx prisma migrate dev` dentro del contenedor backend.
- **Mailhog**: los correos de desarrollo se capturan en `http://localhost:8025`. No se necesita SMTP real.
- **Audit store**: `auditStore` es un array en memoria que se reinicia con cada restart del backend. Al conectar Prisma, descomentar el bloque de `prisma.auditLog.create` en `audit.service.js`.
- **Token reset password**: `resetTokenStore` también es en memoria — mismo comportamiento.
- **companyName en JWT**: el frontend lee `user.companyName` del token para mostrarlo en Sidebar y Navbar. Al conectar BD real, asegurarse de incluirlo en el payload del JWT.
- **auditMiddleware**: está creado pero no aplicado en las rutas de employees aún — aplicar cuando se implemente CRUD real con Prisma.
