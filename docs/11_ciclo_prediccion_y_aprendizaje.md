# 11 — Ciclo de Predicción por Plan y Aprendizaje Acumulativo

Este documento explica dos capacidades que conectan el **modelo de negocio** (planes
mensuales) con el **modelo de Machine Learning**:

1. **Recálculo del riesgo según el plan** — la frescura de la predicción es lo que
   diferencia a los planes.
2. **Aprendizaje acumulativo** — el modelo global mejora a medida que las empresas
   cargan datos históricos con desenlaces reales.

---

## 1. Recálculo del riesgo según el plan

### El problema de negocio

El sistema se vende con planes mensuales de distinto precio. Antes, cualquier empresa
podía recalcular sus predicciones sin límite, así que el plan barato ofrecía lo mismo
que el caro. Eso no sostiene el modelo de negocio.

### La decisión de diseño

Separamos dos cosas que antes estaban mezcladas:

- **Importar datos** → siempre permitido, en cualquier plan. La empresa nunca pierde la
  posibilidad de cargar información ni de acumular historial.
- **Recalcular el riesgo** → limitado por la frecuencia del plan.

Lo que se paga, entonces, es la **frescura de la inteligencia**, no el acceso a ella.

| Plan | Enum en la BD | Frecuencia de recálculo |
|------|---------------|-------------------------|
| Estándar | `BASICO` | Cada 30 días (mensual) |
| Profesional | `PROFESIONAL` | Cada 7 días (semanal) |
| Corporativo | `CORPORATIVO` | Sin límite (bajo demanda) |
| Super Admin | — | Sin límite |

### Cómo funciona técnicamente

**Registro de la última vez.** Se agregó el campo `lastRecalculatedAt` (nullable) al
modelo `Company`. `null` significa "nunca recalculó" y permite el primer cálculo sin
espera.

- Migración: `backend/prisma/migrations/20260909100000_add_last_recalculated_at/`
- Schema: `backend/prisma/schema.prisma` (modelo `Company`)

**La política.** Toda la lógica de "¿puede recalcular ahora?" vive aislada en un módulo
propio, para que sea fácil de leer, probar y ajustar:

- `backend/src/services/recalcPolicy.service.js` → `evaluateRecalcPolicy({ plan, lastRecalculatedAt, isSuperAdmin, now })`

Devuelve si puede recalcular, cuál es la ventana del plan, cuándo estará disponible el
próximo recálculo y un mensaje legible para el usuario.

> **Detalle importante (y un bug que se corrigió):** la frecuencia se deriva del **enum
> `Plan`** (estable), no del texto `PlanConfig.predictionFrequency` (que un admin puede
> editar). Corporativo usa una ventana `null` a propósito (ilimitado). Al principio se
> usó el operador `??` para el valor por defecto, que trataba ese `null` como "ausente"
> y caía al fallback mensual — Corporativo quedaba limitado por error. Se corrigió
> distinguiendo "plan conocido" (aunque su valor sea `null`) de "plan desconocido".

**Dónde se aplica.** En `backend/src/controllers/employees.controller.js`:

- **Al importar** (`importEmployees`): los datos SIEMPRE se guardan (upsert por
  `codigo_empleado`), pero el riesgo solo se recalcula si la ventana lo permite. Si no
  toca, el empleado conserva su riesgo anterior y la respuesta incluye
  `data.recalculo` con la fecha del próximo recálculo. No se crea snapshot cuando no
  hubo recálculo (para no meter puntos falsos en el historial de evolución).
- **Al recalcular manualmente** (`recalculateRisk`): si aún no pasó la ventana, responde
  `429` con `code: 'RECALC_NOT_AVAILABLE'` y el mensaje explicativo. Al recalcular con
  éxito, actualiza `lastRecalculatedAt`.

**En el frontend.** La pantalla de resultados de importación
(`frontend/src/components/employees/ImportResults.jsx`) muestra:

- Un aviso **ámbar** si el riesgo quedó pendiente: "Datos guardados — riesgo aún no
  actualizado", con la fecha del próximo recálculo y una invitación al plan Corporativo.
- Un aviso **azul** si el riesgo sí se actualizó.

---

## 2. Aprendizaje acumulativo (modelo global)

### El problema

Antes, el modelo se entrenaba desde **un CSV estático en el disco** del microservicio
Python. No aprendía de los datos reales que cargaban las empresas: estaban desconectados.

### Por qué un modelo global (y no uno por empresa)

Un modelo de Machine Learning necesita **muchos ejemplos con desenlace conocido** para
aprender. Una empresa chica, con 50 empleados y pocos casos de deserción real, no tiene
datos suficientes para un modelo propio confiable.

La solución es un **modelo global**: se entrena juntando los datos de **todas** las
empresas. Cada empresa aporta su experiencia y todas se benefician del aprendizaje
colectivo. La personalización de cada empresa vive en su **historial** (la evolución de
su riesgo en el tiempo), no en un modelo separado.

### El rol del campo `desercion` (target)

Para aprender, el modelo necesita saber quién **efectivamente se fue**. Ese es el campo
`desercion` del CSV, que se guarda como `desercion_real` en la base:

- Empleados **actuales** (para predecir): `desercion = No`.
- Empleados **históricos** (para enseñarle al modelo): con su desenlace real `Si`/`No`.

Sin casos reales de deserción, el modelo no tiene de qué aprender. Por eso el sistema
exige un mínimo de casos de cada clase antes de reentrenar.

### Cómo funciona técnicamente

**Nuevo endpoint en el ML service** que recibe datos por HTTP (antes solo leía disco):

- `ml-service/routers/training.py` → `POST /api/train/dataset`
- Se refactorizó el núcleo de entrenamiento en `_train_from_dataframe(df)`, reutilizado
  tanto por el `/train` de archivo (compatibilidad) como por el nuevo endpoint.
- Valida un mínimo de **15 casos de cada clase** (`MIN_DESERCION_CASES`); si no alcanza,
  responde `422` con un mensaje claro en vez de entrenar un modelo inútil.

**Servicio de reentrenamiento en el backend:**

- `backend/src/services/globalTraining.service.js`
  - `buildGlobalDataset()`: junta los empleados de **todas** las empresas con su
    desenlace, y los mapea al formato del modelo.
  - `retrainGlobalModel()`: valida que haya datos y dispara el reentrenamiento.

**Privacidad (importante para la tesis).** Al armar el dataset NO se envían nombre,
apellido, código de empleado ni `companyId` al modelo. Solo las 17 variables
predictivas + el desenlace. Es dato **anonimizado**, coherente con la Ley N.º 7593/2025
de Protección de Datos de Paraguay que el sistema ya cita.

**Transformaciones al mapear** (Prisma → formato del modelo):

- `desercion_real` (booleano) → `desercion`: `"Si"` / `"No"`.
- `capacitacion_ultimo_anio` (booleano) → `"Si"` / `"No"`.
- Variables de encuesta clima faltantes (`null`) → se imputan con el valor neutro `3`.

**Endpoint y permisos:**

- `POST /api/model/retrain-global` en `backend/src/routes/model.routes.js`
- **Solo SUPER_ADMIN** puede dispararlo, porque es un modelo compartido por todo el
  sistema. Registra la acción en auditoría (`GLOBAL_MODEL_RETRAINED`).

### Resultado de la prueba real

Se ejecutó el reentrenamiento con los datos actuales de la base:

- Dataset: **553 empleados** (131 desertaron, 422 permanecieron).
- Anonimización verificada: las filas enviadas al modelo no contienen datos personales.
- Métricas obtenidas: accuracy ≈ 0.80, AUC-ROC ≈ 0.82, recall de la clase "se va" ≈ 0.58.

Tras el reentrenamiento, el microservicio detecta el `model.pkl` y empieza a predecir con
el modelo aprendido en lugar del modelo heurístico base.

---

## 3. Cómo se conectan las dos features

Las dos piezas cuentan una sola historia coherente, útil para la defensa:

- **Estándar / Profesional** usan el **modelo global** y ven su riesgo actualizado con la
  frecuencia de su plan (mensual / semanal).
- **Corporativo** actualiza el riesgo **bajo demanda** (sin espera).
- El **modelo global mejora con el tiempo**: cuantas más empresas cargan datos históricos
  con desenlaces reales, mejor aprende el sistema para todas.

El valor del producto no es solo "predecir", sino **predecir mejor con el tiempo** y
ofrecer **inmediatez** como diferenciador del pliego premium.

---

## 4. Privacidad y protección de datos (Ley N.º 7593/2025)

> **Aclaración**: esta sección describe el enfoque técnico de tratamiento de datos.
> No constituye asesoría legal. La conformidad formal con la Ley N.º 7593/2025 de
> Protección de Datos Personales de Paraguay debe ser validada por un asesor legal.

### El sistema SÍ trata datos personales (y está bien)

Cada empresa carga nombre, apellido y código de sus empleados. Esto **no es una falta**:
tratar datos personales es legítimo cuando se cumplen ciertas condiciones. El sistema las
contempla:

| Principio | Cómo se cumple en el sistema |
|-----------|------------------------------|
| **Base legal / consentimiento** | Relación laboral empresa-empleado + registro de consentimiento (`ConsentRecord`). |
| **Finalidad determinada** | Los datos se usan para análisis de retención de talento, la finalidad declarada. |
| **Minimización** | Solo se tratan los datos necesarios para cada finalidad (ver distinción abajo). |
| **Seguridad** | Aislamiento por empresa (multi-tenant) + control de acceso por roles (RBAC). |
| **Derechos del titular** | Revocación de consentimiento ya implementada. |

### La distinción clave: dónde viven los nombres

El nombre y apellido son necesarios **para la empresa**, pero **no** para el modelo. Por
eso el tratamiento se separa según la finalidad:

| Lugar | ¿Datos personales? | Justificación |
|-------|--------------------|---------------|
| CSV que sube la empresa | Sí | La empresa los aporta desde su sistema de RRHH. |
| Base de datos de la empresa (su tenant) | Sí | La empresa necesita saber a *quién* atender. |
| Tabla y detalle de empleados (UI) | Sí | Identificar a la persona en riesgo. |
| **Dataset del modelo global compartido** | **No (anonimizado)** | El modelo no usa el nombre como variable, y son datos de otras empresas. |

### Por qué esto refuerza el cumplimiento (no lo debilita)

- **Minimización de datos**: el dato personal no viaja a donde no hace falta. El modelo
  aprende de edad, salario, horas extra, satisfacción, etc. — nunca del nombre. Quitarlo
  del entrenamiento **no baja la precisión** y elimina un riesgo innecesario.
- **No hay cruce entre empresas**: al anonimizar el dataset global, ningún dato
  identificatorio de la Empresa A entra en un proceso que sirve a la Empresa B.
- **Coherencia con la finalidad**: los nombres se usan solo donde la finalidad los
  requiere (gestión de la empresa), no en el aprendizaje compartido.

### Frase sugerida para la defensa

> "El sistema trata datos personales (nombre, apellido) bajo la relación laboral y con
> consentimiento registrado, aplicando aislamiento por empresa y control de acceso. Para
> el modelo de aprendizaje compartido se aplica anonimización y minimización de datos, de
> modo que ningún dato identificatorio cruza entre empresas."

---

## 5. Limitaciones honestas (para tener presente)

- El reentrenamiento es **manual** (lo dispara el Super Admin). No hay todavía un job
  automático programado; se puede agregar más adelante.
- La calidad del modelo depende de que las empresas carguen **datos históricos con
  deserción real**. Con solo empleados actuales (todos `desercion = No`), el modelo no
  puede aprender: el sistema lo detecta y lo informa en vez de fallar en silencio.
- Es un **único modelo global**, no un modelo ajustado por empresa. Un modelo por empresa
  (fine-tuning por tenant) sería un paso futuro, viable solo para empresas grandes con
  suficientes datos propios.
- El umbral mínimo de casos (15 por clase) es un piso de seguridad, no una garantía de
  buen desempeño; con datasets chicos las métricas serán inestables.

---

## 6. Guía de demostración (para la defensa)

Hay dos datasets de prueba listos en `frontend/public/`:

- `dataset_prueba_50.csv` — **mes 1**: 50 empleados con nombres reales, mezcla de niveles
  de riesgo y 11 casos de deserción.
- `dataset_prueba_50_mes2.csv` — **mes 2**: los mismos empleados un mes después, con datos
  que evolucionaron. Faltan EMP-004 y EMP-022 (para demostrar la baja de ausentes).

Se descargan desde `http://localhost:5173/dataset_prueba_50.csv` (y `..._mes2.csv`) o se
suben con el botón **Importar CSV**.

### Qué plan usar para la demo

El recálculo del riesgo respeta la frecuencia del plan. Para mostrar la evolución entre
las **dos** subidas **el mismo día**, la empresa de prueba debe poder recalcular dos veces
seguidas. Por eso:

> **Usar una empresa con plan CORPORATIVO** (recálculo bajo demanda, sin espera), o iniciar
> sesión como **SUPER_ADMIN**. Con planes Estándar (mensual) o Profesional (semanal), la
> segunda subida guardaría los datos pero **no** recalcularía el riesgo hasta que pase la
> ventana — y no se vería el cambio en el momento.

La empresa demo del seed (`Devsoft S.A.`) es plan **Profesional**; para la demo de
evolución conviene cambiarla a Corporativo temporalmente, o usar el portal de Super Admin.

### Guion sugerido (historia que se cuenta)

1. **Subir el mes 1** (`dataset_prueba_50.csv`). Mostrar la pantalla de resultados: el
   semáforo de riesgo, cuántos necesitan atención, y el detalle de un empleado con su
   "por qué" y las recomendaciones.
2. **Subir el mes 2** (`dataset_prueba_50_mes2.csv`) con el checkbox de baja activado.
   Mostrar que el sistema reconoce a las mismas personas (no duplica) y ofrece dar de baja
   a los ausentes (EMP-004 y EMP-022).
3. **Abrir el detalle de Carla Gimenez (EMP-001)**: su riesgo subió de ~26% a ~68% (BAJO →
   ALTO). El gráfico de evolución muestra la curva subiendo. Explicar el porqué: se le
   dispararon las horas extra y cayó su satisfacción.
4. **Abrir el detalle de Diego Rojas (EMP-002)**: su riesgo bajó de ~61% a ~37% (ALTO →
   MEDIO). Explicar la retención efectiva: pasó a contrato indefinido, recibió capacitación
   y se le redujeron las horas extra.

Este contraste (uno que empeora, uno que mejora) demuestra que el sistema no solo predice,
sino que **refleja el impacto de las decisiones de retención** a lo largo del tiempo.

> Los valores de riesgo son aproximados: el modelo agrega un pequeño componente aleatorio,
> así que pueden variar ±2% entre corridas. Los saltos de nivel (BAJO↔ALTO) sí se mantienen.

---

## 7. Referencia rápida de archivos

| Archivo | Rol |
|---------|-----|
| `frontend/public/dataset_prueba_50.csv` | Dataset de prueba mes 1 (50 empleados) |
| `frontend/public/dataset_prueba_50_mes2.csv` | Dataset de prueba mes 2 (evolución + bajas) |
| `backend/prisma/schema.prisma` | Campo `Company.lastRecalculatedAt` |
| `backend/prisma/migrations/20260909100000_add_last_recalculated_at/` | Migración del campo |
| `backend/src/services/recalcPolicy.service.js` | Política de frecuencia de recálculo |
| `backend/src/controllers/employees.controller.js` | Aplica la política en import y recalculate |
| `backend/src/services/globalTraining.service.js` | Arma el dataset global y reentrena |
| `backend/src/services/ml.service.js` | `trainDataset()` → llama al ML service |
| `backend/src/routes/model.routes.js` | `POST /api/model/retrain-global` (solo Super Admin) |
| `ml-service/routers/training.py` | `POST /api/train/dataset` + `_train_from_dataframe()` |
| `frontend/src/components/employees/ImportResults.jsx` | Muestra el estado del recálculo |
