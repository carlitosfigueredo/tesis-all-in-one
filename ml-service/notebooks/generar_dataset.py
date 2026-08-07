"""
Script para generar el dataset sintetico de desercion laboral
enfocado en empresas de desarrollo de software de Asuncion, Paraguay.

Variables: 17 features + 1 target (desercion)
Registros: 1000
Tasa de desercion objetivo: ~22%

Las correlaciones estan disenadas para reflejar patrones realistas:
- Salario bajo + estancamiento + horas extra = mas desercion
- Buen feedback + capacitacion + antiguedad alta = menos desercion
- Empleados nuevos (<12 meses) tienen mas riesgo
"""

import numpy as np
import pandas as pd

np.random.seed(42)

N = 1000

# ─── VARIABLES DE RRHH (datos duros que la empresa tiene) ────────────────────

# 1. edad: 20-55 anios, distribucion normal centrada en 30
edad = np.clip(np.random.normal(30, 6, N).astype(int), 20, 55)

# 2. nivel_formacion: Secundaria, Tecnico, Universitario, Posgrado
nivel_formacion = np.random.choice(
    ["Secundaria", "Tecnico", "Universitario", "Posgrado"],
    size=N,
    p=[0.05, 0.15, 0.60, 0.20]
)

# 3. rol_tecnologico
rol_tecnologico = np.random.choice(
    ["Frontend", "Backend", "Fullstack", "Mobile", "DevOps", "QA", "Data"],
    size=N,
    p=[0.18, 0.22, 0.20, 0.12, 0.10, 0.10, 0.08]
)

# 4. seniority
seniority = np.random.choice(
    ["Trainee", "Junior", "Semi-Senior", "Senior", "Lead"],
    size=N,
    p=[0.08, 0.25, 0.35, 0.22, 0.10]
)

# 5. antiguedad_meses: 1-120, sesgado a valores bajos (mucha rotacion)
antiguedad_meses = np.clip(
    np.random.exponential(24, N).astype(int) + 1, 1, 120
)

# 6. modalidad_trabajo
modalidad_trabajo = np.random.choice(
    ["Presencial", "Hibrido", "Remoto"],
    size=N,
    p=[0.25, 0.40, 0.35]
)

# 7. tipo_contrato
tipo_contrato = np.random.choice(
    ["Indefinido", "Plazo fijo", "Eventual"],
    size=N,
    p=[0.60, 0.25, 0.15]
)

# 8. salario_mensual: en guaranies, rangos realistas por seniority
salario_base = {
    "Trainee":     (3_000_000, 5_000_000),
    "Junior":      (4_500_000, 8_000_000),
    "Semi-Senior": (7_000_000, 13_000_000),
    "Senior":      (11_000_000, 20_000_000),
    "Lead":        (15_000_000, 28_000_000),
}
salario_mensual = np.array([
    np.random.randint(salario_base[s][0], salario_base[s][1])
    for s in seniority
])

# 9. cantidad_horas_extra_mes: 0-40, sesgado a valores bajos
cantidad_horas_extra_mes = np.clip(
    np.random.exponential(8, N).astype(int), 0, 40
)

# 10. capacitacion_ultimo_anio: Si/No
capacitacion_ultimo_anio = np.random.choice(
    ["Si", "No"],
    size=N,
    p=[0.45, 0.55]
)

# 11. evaluacion_desempeno: 1-5, distribucion normal centrada en 3.5
evaluacion_desempeno = np.clip(
    np.random.normal(3.5, 0.8, N).round().astype(int), 1, 5
)

# 12. cantidad_empresas_anteriores: 0-8
cantidad_empresas_anteriores = np.clip(
    np.random.poisson(2, N), 0, 8
)

# ─── VARIABLES DE ENCUESTA CLIMA (empresa les pregunta a empleados) ──────────

# 13. satisfaccion_laboral: 1-5
satisfaccion_laboral = np.clip(
    np.random.normal(3.3, 1.0, N).round().astype(int), 1, 5
)

# 14. satisfaccion_ambiente: 1-5
satisfaccion_ambiente = np.clip(
    np.random.normal(3.4, 0.9, N).round().astype(int), 1, 5
)

# 15. equilibrio_vida_trabajo: 1-5
# Correlacion: mas horas extra = peor equilibrio
equilibrio_base = np.random.normal(3.5, 0.9, N)
penalty_horas = cantidad_horas_extra_mes * 0.05
equilibrio_vida_trabajo = np.clip(
    (equilibrio_base - penalty_horas).round().astype(int), 1, 5
)

# 16. estancamiento_carrera: 1-5
# Correlacion: mas antiguedad en el mismo puesto + sin capacitacion = mas estancamiento
estancamiento_base = np.random.normal(2.5, 1.0, N)
penalty_antiguedad = np.where(antiguedad_meses > 36, 0.5, 0)
penalty_capacitacion = np.where(capacitacion_ultimo_anio == "No", 0.4, 0)
estancamiento_carrera = np.clip(
    (estancamiento_base + penalty_antiguedad + penalty_capacitacion).round().astype(int), 1, 5
)

# 17. feedback_lider: 1-5
feedback_lider = np.clip(
    np.random.normal(3.2, 1.0, N).round().astype(int), 1, 5
)

# ─── VARIABLE TARGET: desercion ──────────────────────────────────────────────
# Calculamos un score de riesgo basado en todas las variables
# y luego aplicamos un umbral probabilistico

riesgo_score = np.zeros(N, dtype=float)

# Factores que AUMENTAN riesgo de desercion:
riesgo_score += (5 - satisfaccion_laboral) * 0.15       # Baja satisfaccion
riesgo_score += (5 - satisfaccion_ambiente) * 0.10      # Mal ambiente
riesgo_score += (5 - equilibrio_vida_trabajo) * 0.12    # Mal balance
riesgo_score += estancamiento_carrera * 0.14            # Estancamiento
riesgo_score += (5 - feedback_lider) * 0.08             # Poco feedback
riesgo_score += np.where(cantidad_horas_extra_mes > 15, 0.3, 0)  # Muchas horas extra
riesgo_score += np.where(cantidad_horas_extra_mes > 25, 0.2, 0)  # Extremo
riesgo_score += np.where(capacitacion_ultimo_anio == "No", 0.15, 0)  # Sin capacitacion
riesgo_score += np.where(antiguedad_meses < 12, 0.2, 0)  # Nuevos
riesgo_score += np.where(tipo_contrato == "Eventual", 0.25, 0)  # Contrato precario
riesgo_score += np.where(tipo_contrato == "Plazo fijo", 0.1, 0)
riesgo_score += cantidad_empresas_anteriores * 0.04     # Perfil movil

# Salario bajo relativo al seniority aumenta riesgo
salario_mediana_seniority = {
    "Trainee": 4_000_000, "Junior": 6_000_000,
    "Semi-Senior": 10_000_000, "Senior": 15_000_000, "Lead": 20_000_000
}
for i in range(N):
    mediana = salario_mediana_seniority[seniority[i]]
    if salario_mensual[i] < mediana * 0.8:
        riesgo_score[i] += 0.3
    elif salario_mensual[i] < mediana * 0.95:
        riesgo_score[i] += 0.1

# Factores que REDUCEN riesgo:
riesgo_score -= np.where(evaluacion_desempeno >= 4, 0.1, 0)  # Buen desempeno reconocido
riesgo_score -= np.where(antiguedad_meses > 48, 0.15, 0)     # Arraigo
riesgo_score -= np.where(modalidad_trabajo == "Remoto", 0.1, 0)  # Remoto retiene

# Normalizar score a probabilidad (0-1)
# Ajuste del umbral para obtener ~22% de desercion
riesgo_prob = 1 / (1 + np.exp(-(riesgo_score - 2.5)))  # Sigmoid centrada

# Agregar ruido y generar target binario
ruido = np.random.uniform(-0.1, 0.1, N)
prob_final = np.clip(riesgo_prob + ruido, 0, 1)
desercion = np.where(np.random.uniform(0, 1, N) < prob_final, "Si", "No")

# ─── CONSTRUIR DATAFRAME ─────────────────────────────────────────────────────

df = pd.DataFrame({
    "edad": edad,
    "nivel_formacion": nivel_formacion,
    "rol_tecnologico": rol_tecnologico,
    "seniority": seniority,
    "antiguedad_meses": antiguedad_meses,
    "modalidad_trabajo": modalidad_trabajo,
    "tipo_contrato": tipo_contrato,
    "salario_mensual": salario_mensual,
    "cantidad_horas_extra_mes": cantidad_horas_extra_mes,
    "capacitacion_ultimo_anio": capacitacion_ultimo_anio,
    "evaluacion_desempeno": evaluacion_desempeno,
    "cantidad_empresas_anteriores": cantidad_empresas_anteriores,
    "satisfaccion_laboral": satisfaccion_laboral,
    "satisfaccion_ambiente": satisfaccion_ambiente,
    "equilibrio_vida_trabajo": equilibrio_vida_trabajo,
    "estancamiento_carrera": estancamiento_carrera,
    "feedback_lider": feedback_lider,
    "desercion": desercion,
})

# ─── GUARDAR ─────────────────────────────────────────────────────────────────

output_path = "data/dataset_desercion_software_py.csv"
df.to_csv(output_path, index=False)

# ─── ESTADISTICAS ────────────────────────────────────────────────────────────

print(f"Dataset generado: {output_path}")
print(f"Registros: {len(df)}")
print(f"Columnas: {len(df.columns)}")
print(f"\nTasa de desercion: {(df['desercion'] == 'Si').mean():.1%}")
print(f"\nDistribucion de desercion:")
print(df["desercion"].value_counts())
print(f"\nPrimeras 5 filas:")
print(df.head())
print(f"\nEstadisticas numericas:")
print(df.describe())
