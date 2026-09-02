---
inclusion: auto
---

# Formato de tablas Markdown

Cuando generes tablas en archivos Markdown (.md), NO agregues espacios entre el pipe (|) y el contenido de la celda.

## Correcto
```
|Campo|Tipo|Descripción|
|-----|----|----|
|id|UUID|Identificador único|
```

## Incorrecto
```
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
```

Esta regla aplica a todos los archivos .md del proyecto.
