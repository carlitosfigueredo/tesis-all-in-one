---
inclusion: always
---

# Configuración del Sistema — SystemConfig

## Concepto

El sistema tiene una tabla `system_configs` en PostgreSQL (clave/valor JSON) que almacena parámetros globales editables por el SUPER_ADMIN desde el panel de administración. Esto evita hardcodear valores en el código y permite cambiarlos en producción sin redeploy.

---

## Tabla `system_configs`

```sql
CREATE TABLE "system_configs" (
    "key"       TEXT PRIMARY KEY,
    "value"     JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT   -- userId del admin que hizo el último cambio
);
```

Modelo Prisma: `SystemConfig` en `schema.prisma`.

---

## Claves disponibles

| key | Descripción | Valor por defecto |
|-----|-------------|-------------------|
| `password_policy` | Política de contraseñas | `{"minLength":8,"maxLength":128,"requireUppercase":true,"requireLowercase":true,"requireNumber":true,"requireSpecial":true}` |
| `reset_token_config` | Configuración del token de reset de contraseña | `{"ttlMinutes":5,"maxDailyRequests":3}` |

---

## Servicio central: `systemConfig.service.js`

Ubicación: `backend/src/services/systemConfig.service.js`

Funciones exportadas:

```js
// Leer cualquier clave (con cache de 1 minuto)
getConfig(key)           → Promise<any>

// Escribir cualquier clave (invalida cache)
setConfig(key, value, updatedBy)  → Promise<void>

// Helpers tipados
getPasswordPolicy()      → Promise<PasswordPolicy>
getResetTokenConfig()    → Promise<ResetTokenConfig>
```

**Cache:** 1 minuto en memoria (`CACHE_TTL_MS = 60_000`). Al hacer `setConfig` se invalida automáticamente. Esto significa que los cambios aplican en máximo 1 minuto en el backend.

**Fallback:** Si la BD no tiene la clave, se usan los valores por defecto definidos como `DEFAULT_*` en el mismo service.

---

## Endpoints del backend

### Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/password-policy` | Política de contraseñas vigente (sin auth) |

### Solo SUPER_ADMIN

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/config/password-policy` | Leer política de contraseñas |
| PUT | `/api/admin/config/password-policy` | Actualizar política de contraseñas |
| GET | `/api/admin/config/reset-token` | Leer config del token de reset |
| PUT | `/api/admin/config/reset-token` | Actualizar config del token de reset |

Validaciones en el PUT:
- `password_policy`: `minLength` entre 4–32, `maxLength` entre 32–256
- `reset_token_config`: `ttlMinutes` entre 1–1440, `maxDailyRequests` entre 1–20

---

## Panel de administración (frontend)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/admin/settings/password-policy` | `AdminPasswordPolicy.jsx` | Editar requisitos de contraseñas |
| `/admin/settings/reset-token` | `AdminResetTokenConfig.jsx` | Editar duración del token de reset |

Ambas páginas siguen el mismo patrón:
1. `useEffect` → `GET /api/admin/config/*` → carga valores actuales
2. Formulario con inputs y toggles
3. Botón "Guardar cambios" (habilitado solo si hay cambios: `dirty`)
4. `PUT /api/admin/config/*` → guarda en BD
5. Toast de éxito/error auto-dismiss a los 4 segundos

---

## Política de contraseñas — flujo completo

```
Admin cambia política en /admin/settings/password-policy
    ↓
PUT /api/admin/config/password-policy → BD actualizada → cache invalidado
    ↓
Próximo request de validación de contraseña en el backend:
    auth.controller.js / users.controller.js llama getPasswordPolicy()
    → lee de BD (cache fresco)
    → pasa policy a validatePasswordPolicy(password, policy, user)
    ↓
Frontend: hook usePasswordPolicy() hace GET /api/auth/password-policy
    → cache de módulo invalidado con invalidatePasswordPolicyCache()
    → PasswordStrengthIndicator muestra reglas actualizadas
    → Register / ForceChangePassword / Profile usan policy.minLength
```

### Hook del frontend

```js
import { usePasswordPolicy } from '../hooks/usePasswordPolicy';

const { policy, rules, loading } = usePasswordPolicy();
// policy.minLength, policy.requireUppercase, etc.
// rules: array de { label, test } para el indicador visual
```

Para invalidar el cache del frontend después de guardar:
```js
import { invalidatePasswordPolicyCache } from '../hooks/usePasswordPolicy';
invalidatePasswordPolicyCache(); // llamar en el PUT exitoso
```

---

## Agregar una nueva clave de configuración

1. Insertar fila en la BD:
```sql
INSERT INTO system_configs (key, value, "updatedAt")
VALUES ('nueva_config', '{"campo": valor}'::jsonb, NOW());
```

2. Agregar `DEFAULT_*` y función `get*()` en `systemConfig.service.js`

3. Agregar endpoints `GET/PUT /api/admin/config/nueva-config` en `admin.routes.js`

4. Crear página `AdminNuevaConfig.jsx` siguiendo el patrón de `AdminPasswordPolicy.jsx`

5. Agregar item al `AdminSidebar.jsx` y ruta en `App.jsx`
