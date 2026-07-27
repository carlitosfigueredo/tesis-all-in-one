---
inclusion: always
---

# Forma de trabajo — Tesis SaaS BI de Retención de Talento

## Contexto del proyecto

Sistema de Business Intelligence orientado a la retención de talento humano, construido como **SaaS multiempresa (multi-tenant)**. Cada empresa que contrate el servicio tiene su propio espacio de datos aislado, su propio dashboard y sus propios usuarios.

El proyecto es una tesis académica, por lo que se espera:
- Justificar decisiones de diseño con criterios de seguridad, escalabilidad y buenas prácticas.
- Aplicar estándares reconocidos (OWASP, NIST, ISO 27001 donde aplique).
- Documentar los cambios relevantes en los archivos de `docs/`.

## Idioma en el proyecto

| Contexto | Idioma | Ejemplo |
|---|---|---|
| Mensajes de API (JSON) | Español paraguayo | `"El correo o la contraseña no son correctos"` |
| Mensajes de validación | Español paraguayo | `"La contraseña tiene que tener al menos 8 caracteres"` |
| Labels y textos del frontend | Español paraguayo | `"Iniciar sesión"`, `"Ver empleados"` |
| Correos electrónicos | Español paraguayo | `"Hola, [Nombre]. Tu cuenta fue bloqueada."` |
| Comentarios en código | Español simple, sin acentos | `// busca el usuario por email` |
| Nombres de variables/funciones/rutas | Inglés | `getEmployees`, `/api/auth/login` |
| Nombres de tablas, enums, columnas | Inglés | `audit_logs`, `SUPER_ADMIN`, `tenantId` |

El tono de los mensajes de usuario es directo y cercano: tuteo, sin formalidades innecesarias, sin tecnicismos.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend API | Node.js + Express + Prisma ORM |
| Base de datos | PostgreSQL 16 |
| ML Service | Python 3 + FastAPI |
| Infraestructura | Docker + Docker Compose |
| Correos | Nodemailer (SMTP configurable) |

## Modelo de datos central

La unidad base del SaaS es el **Tenant** (empresa). Todo recurso del sistema pertenece a un tenant:
- `tenantId` es obligatorio en toda tabla que no sea de administración global.
- Los usuarios pertenecen a un tenant y tienen un rol dentro de él.
- Los empleados analizados pertenecen a un tenant.
- Los logs de auditoría registran el `tenantId`, `userId`, acción, recurso y timestamp.

## Reglas generales de desarrollo

- Antes de crear un endpoint, verificar que exista el middleware de autenticación JWT y el guard de tenant.
- Nunca retornar datos de un tenant distinto al del usuario autenticado.
- Toda operación de escritura (POST, PUT, PATCH, DELETE) debe generar un registro en la tabla `audit_logs`.
- Usar Prisma Migrate para todos los cambios de esquema. No modificar la BD a mano.
- Las variables de entorno sensibles van en `.env` (nunca hardcodeadas). Ver `backend/.env.example` como referencia.
- Seguir el estilo definido en `.github/copilot-instructions.md`: camelCase, PascalCase, sin `ñ` en código.

## Flujos prioritarios

1. **Registro de empresa** → crea tenant + usuario ADMIN → envía correo de bienvenida.
2. **Login** → valida credenciales → registra intento en `audit_logs` → retorna JWT.
3. **Restaurar contraseña** → email → token UUID con TTL 5 min → formulario → nueva contraseña validada → token invalidado.
4. **Análisis ML** → backend llama al ml-service → resultado se guarda en el empleado → se registra en auditoría.
5. **Dashboard por empresa** → solo muestra datos del tenant autenticado.

## Iteración incremental

Trabajar en este orden cuando se implemente una nueva entidad o feature:
1. Actualizar `schema.prisma` y correr `prisma migrate dev`.
2. Implementar el servicio/controlador en el backend.
3. Agregar la ruta con sus middlewares.
4. Actualizar el frontend (si aplica).
5. Documentar en `docs/` si el cambio es estructural.
