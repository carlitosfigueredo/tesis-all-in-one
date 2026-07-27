# Instrucciones generales del proyecto

## Idioma y tono
- Responder siempre en espanol paraguayo: directo, sin rodeos, tono natural de quien escribe para si mismo.
- Los mensajes de usuario (API responses, validaciones, errores, emails, labels del frontend) van en espanol paraguayo.
  Ejemplos de tono:
  - En vez de "Credenciales invalidas" → "El correo o la contrasena no son correctos"
  - En vez de "Ha ocurrido un error inesperado" → "Algo salio mal, intenta de nuevo"
  - En vez de "Su cuenta ha sido bloqueada" → "Tu cuenta fue bloqueada por 30 minutos"
  - En vez de "Estimado usuario" (en emails) → "Hola, [Nombre]"
- Los nombres de variables, funciones, rutas, tablas y enums van en ingles (convencion tecnica, no mezclar).
- Evitar acentos en comentarios de codigo para evitar problemas de encoding; usarlos si el texto es legible sin ellos.
- No usar `ñ` en nombres de variables, funciones, archivos, clases o constantes; reemplazarla por `n`.
- Mantener los comentarios breves y utiles, como notas personales del autor.
- Evitar que los comentarios suenen mecanicos o generados por IA.
- No usar emojis en comentarios, respuestas ni textos del proyecto salvo que el usuario lo pida.

## Como trabajar en este repositorio
- Priorizar soluciones coherentes con una tesis: consistencia terminologica, nombres estables y estructura clara.
- Antes de proponer cambios grandes, revisar el contexto cercano y ajustar la solucion al estilo existente.
- Hacer cambios pequenos y puntuales cuando sea posible.
- No tocar archivos ajenos al objetivo del cambio.

## Estilo de codigo
- Usar HTML5 semantico cuando aplique: header, main, section, article y similares.
- Preferir JavaScript moderno: const, let, arrow functions y template literals.
- Export components as default modules from appropriately named PascalCase files, e.g. ComponentName.js.

## Nombres
- Usar PascalCase para componentes, interfaces y tipos.
- Usar camelCase para variables, funciones y metodos.
- Mantener prefijos con guion bajo solo para miembros privados cuando el proyecto ya lo use.
- Use ALL_CAPS for global configuration constants (e.g., API_URL). Use camelCase for local state and references declared with const.
- Si un nombre original trae `ñ`, cambiarlo a `n` de forma consistente en todo el codigo relacionado.

## Calidad
- Elegir nombres descriptivos y estables.
- Validar entradas al inicio de las funciones cuando corresponda.
- Wrap API calls in async try/catch blocks and return a structured error object { error: string } on failure. Validate user inputs at the start of functions and throw standard Error instances for invalid parameters.
- Include helpful comments for nested loops, regex evaluations, mathematical algorithms, and external API integrations.
