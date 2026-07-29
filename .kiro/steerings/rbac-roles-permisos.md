---
inclusion: always
---

# RBAC — Roles y Permisos Granulares

## Arquitectura

El sistema usa un modelo RBAC (Role-Based Access Control) con tablas normalizadas:

```
User ← user_roles → Role ← role_permissions → Permission
```

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `roles` | Roles del sistema. Pueden ser globales (companyId=null) o por empresa |
| `permissions` | Permisos atomicos agrupados por modulo |
| `role_permissions` | Tabla intermedia Role ↔ Permission (muchos a muchos) |
| `user_roles` | Tabla intermedia User ↔ Role (muchos a muchos) |

### Campo `isSystem` en roles

Los roles con `isSystem: true` son los 4 roles default que no se pueden eliminar:
- SUPER_ADMIN, COMPANY_ADMIN, ANALYST, VIEWER

Las empresas pueden crear roles personalizados adicionales con `isSystem: false`.

---

## Permisos del sistema (19 total)

| Modulo | Codigo | Nombre |
|--------|--------|--------|
| employees | `employees.read` | Ver empleados |
| employees | `employees.write` | Crear/editar empleados |
| employees | `employees.delete` | Eliminar empleados |
| employees | `employees.import` | Importar empleados CSV |
| predictions | `predictions.run` | Ejecutar prediccion |
| predictions | `predictions.batch` | Prediccion en batch |
| dashboard | `dashboard.view` | Ver dashboard |
| model | `model.view` | Ver estado del modelo |
| model | `model.train` | Entrenar modelo |
| users | `users.read` | Ver usuarios |
| users | `users.write` | Crear/editar usuarios |
| users | `users.toggle` | Activar/desactivar usuarios |
| payments | `payments.view` | Ver pagos/suscripcion |
| payments | `payments.process` | Procesar pagos |
| admin | `admin.companies` | Gestionar empresas |
| admin | `admin.plans` | Gestionar planes |
| admin | `admin.audit` | Ver auditoria global |
| admin | `admin.payments` | Ver pagos globales |
| admin | `admin.roles` | Gestionar roles/permisos |

---

## Roles default y sus permisos

### SUPER_ADMIN
Todos los 19 permisos. Acceso total.

### COMPANY_ADMIN (14 permisos)
employees.read, employees.write, employees.delete, employees.import, predictions.run, predictions.batch, dashboard.view, model.view, model.train, users.read, users.write, users.toggle, payments.view, payments.process

### ANALYST (4 permisos)
employees.read, predictions.run, predictions.batch, dashboard.view, model.view

### VIEWER (2 permisos)
employees.read, dashboard.view

---

## Uso en el backend

### Middleware `requirePermission`

```js
const { requirePermission } = require('../middlewares/permission.middleware');

// Requiere UN permiso especifico
router.get('/employees', requirePermission('employees.read'), getEmployees);

// Requiere AL MENOS UNO de los permisos listados
router.get('/stats', requirePermission('dashboard.view', 'employees.read'), getStats);
```

### Middleware `requireRole` (backward compat)

```js
const { requireRole } = require('../middlewares/auth.middleware');

// Sigue funcionando si necesitas verificar por nombre de rol
router.use(requireRole('SUPER_ADMIN'));
```

### Cache de permisos

Los permisos se cachean 1 minuto en memoria por usuario. Al cambiar roles/permisos, invalidar con:

```js
const { invalidatePermissionCache } = require('../middlewares/permission.middleware');
invalidatePermissionCache(userId);
```

---

## Uso en el frontend

### AuthContext provee:

```js
const {
  user,                    // { ...userData, roles: [...], permissions: [...] }
  hasPermission,           // (code) => boolean
  hasAnyPermission,        // (...codes) => boolean
  hasRole,                 // (roleName) => boolean
  isSuperAdmin,            // boolean
  isCompanyAdmin,          // boolean
  canEdit,                 // boolean (employees.write o users.write)
} = useAuth();
```

### Ejemplo en componentes:

```jsx
const { hasPermission } = useAuth();

// Mostrar boton solo si tiene permiso
{hasPermission('employees.write') && <button>Nuevo empleado</button>}

// Verificar rol
{hasRole('COMPANY_ADMIN') && <AdminPanel />}
```

---

## Flujo al registrar empresa

1. Se crea la empresa + usuario
2. Se busca el rol global `COMPANY_ADMIN` (isSystem=true)
3. Se crea entrada en `user_roles` para asignar ese rol al usuario
4. Al loguear, el login carga roles+permisos via `getUserPermissions(userId)`
5. El JWT contiene `roles: [...]` y el response contiene `permissions: [...]`

---

## Para agregar un nuevo permiso

1. Agregarlo al array `PERMISSIONS` en `prisma/seed.js`
2. Asignarlo al rol correspondiente en `SYSTEM_ROLES`
3. Ejecutar seed: `npx prisma db seed`
4. Usar `requirePermission('nuevo.permiso')` en la ruta correspondiente

---

## Notas tecnicas

- Los permisos se cargan UNA vez por request (en `protect` middleware)
- SUPER_ADMIN bypasea el check de `requirePermission` (tiene acceso total)
- Un usuario puede tener multiples roles (muchos a muchos)
- Los permisos efectivos son la UNION de todos los permisos de todos sus roles
- Roles custom por empresa: crear con `companyId` != null para que solo aplique a esa empresa
