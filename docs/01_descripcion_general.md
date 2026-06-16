# 01 — Descripción General del Sistema

## ¿Qué es?

Sistema de Inteligencia de Negocios (BI) orientado a la **predicción de fuga de talento** y la optimización de estrategias de retención de empleados en el **sector retail de la Zona Metropolitana de Asunción, Paraguay**.

El sistema integra análisis de datos históricos de empleados con un modelo de Machine Learning que calcula la probabilidad de que cada empleado renuncie (denominada `flightRisk`), permitiendo al área de Recursos Humanos anticiparse y tomar acciones de retención.

---

## Problema que resuelve

La rotación de personal en el sector retail es uno de los costos operativos más altos y menos controlados. Reemplazar a un empleado puede costar entre 50% y 200% de su salario anual considerando reclutamiento, capacitación y pérdida de productividad.

El sistema responde las preguntas:
- ¿Qué empleados tienen mayor probabilidad de renunciar en los próximos meses?
- ¿Qué factores impulsan esa decisión?
- ¿Qué departamentos tienen mayor riesgo agregado?

---

## Usuarios del sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `ADMIN` | Administrador del sistema BI | Completo |
| `ANALYST` | Analista de Recursos Humanos | Lectura y predicciones |
| `VIEWER` | Ejecutivo / Directivo | Solo visualización (futuro) |

---

## Stack tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                     USUARIO FINAL                        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP / Browser
┌─────────────────────▼───────────────────────────────────┐
│           FRONTEND  React 18 + Vite + Tailwind CSS       │
│                     Recharts (gráficos)                  │
│                     Puerto: 5173                         │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API / JSON
┌─────────────────────▼───────────────────────────────────┐
│           BACKEND   Node.js 20 + Express                 │
│                     JWT Auth + Helmet + CORS             │
│                     Puerto: 4000                         │
└──────┬──────────────┴──────────────────────────────────┘
       │ HTTP interno          │ PostgreSQL Protocol
       │ (Docker network)      │
┌──────▼──────────┐   ┌────────▼────────────────────────┐
│   ML SERVICE    │   │   BASE DE DATOS                  │
│   Python 3.11   │   │   PostgreSQL 16                  │
│   FastAPI       │   │   ORM: Prisma                    │
│   scikit-learn  │   │   Puerto: 5432                   │
│   Puerto: 8000  │   │                                  │
└─────────────────┘   └──────────────────────────────────┘
```

---

## Estado actual del proyecto

| Componente | Estado |
|------------|--------|
| Frontend (Login, Dashboard, Empleados) | ✅ Funcional |
| Backend API REST | ✅ Funcional |
| Autenticación JWT | ✅ Funcional (usuarios mock) |
| Base de datos PostgreSQL | ✅ Contenedor activo |
| Schema Prisma | ✅ Definido, pendiente migración |
| Microservicio ML | ✅ Funcional con modelo dummy |
| Modelo ML real (Random Forest) | 🔄 En entrenamiento (notebook listo) |
| Integración datos reales de empleados | 🔄 Pendiente (usando mock data) |
