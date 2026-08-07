"""
Genera 5 datasets de prueba simulando empresas de software de Asuncion.
Cada empresa tiene un perfil distinto para que los datos sean variados.

Empresas:
1. TechNova Solutions (120 empleados) - Startup grande, mayoria jovenes, sueldos medios
2. Guarani Code SRL (85 empleados) - Software factory, mucha rotacion, horas extra
3. DataPy Consulting (52 empleados) - Consultora, seniors bien pagos, estable
4. AppMakers Paraguay (345 empleados) - Empresa grande, diversa, mixta
5. CloudSoft SACI (178 empleados) - Mediana, enfocada en DevOps/Cloud, remoto
"""

import numpy as np
import pandas as pd
import os

OUTPUT_DIR = "data/empresas"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generar_empresa(nombre, n, seed, perfil):
    """
    Genera un dataset para una empresa con un perfil especifico.
    
    perfil es un dict con parametros que ajustan las distribuciones:
    - edad_media, edad_std
    - salario_factor (multiplicador sobre la base por seniority)
    - horas_extra_media
    - satisfaccion_media
    - tasa_capacitacion
    - prob_remoto, prob_hibrido
    - prob_indefinido
    - seniority_dist (dict con probabilidades)
    - roles_dist (dict con probabilidades)
    """
    np.random.seed(seed)
    p = perfil

    # Edad
    edad = np.clip(
        np.random.normal(p["edad_media"], p.get("edad_std", 5), n).astype(int),
        20, 55
    )

    # Nivel formacion
    nivel_formacion = np.random.choice(
        ["Secundaria", "Tecnico", "Universitario", "Posgrado"],
        size=n,
        p=p.get("formacion_dist", [0.05, 0.15, 0.60, 0.20])
    )

    # Rol tecnologico
    roles = list(p["roles_dist"].keys())
    roles_probs = list(p["roles_dist"].values())
    rol_tecnologico = np.random.choice(roles, size=n, p=roles_probs)

    # Seniority
    seniorities = list(p["seniority_dist"].keys())
    seniority_probs = list(p["seniority_dist"].values())
    seniority = np.random.choice(seniorities, size=n, p=seniority_probs)

    # Antiguedad
    antiguedad_meses = np.clip(
        np.random.exponential(p.get("antiguedad_media", 24), n).astype(int) + 1,
        1, 120
    )

    # Modalidad
    modalidad_trabajo = np.random.choice(
        ["Presencial", "Hibrido", "Remoto"],
        size=n,
        p=[
            1 - p["prob_remoto"] - p["prob_hibrido"],
            p["prob_hibrido"],
            p["prob_remoto"],
        ]
    )

    # Tipo contrato
    tipo_contrato = np.random.choice(
        ["Indefinido", "Plazo fijo", "Eventual"],
        size=n,
        p=[p["prob_indefinido"], (1 - p["prob_indefinido"]) * 0.6, (1 - p["prob_indefinido"]) * 0.4]
    )

    # Salario por seniority
    salario_base = {
        "Trainee":     (3_000_000, 5_000_000),
        "Junior":      (4_500_000, 8_000_000),
        "Semi-Senior": (7_000_000, 13_000_000),
        "Senior":      (11_000_000, 20_000_000),
        "Lead":        (15_000_000, 28_000_000),
    }
    factor = p["salario_factor"]
    salario_mensual = np.array([
        int(np.random.randint(
            int(salario_base[s][0] * factor),
            int(salario_base[s][1] * factor)
        ))
        for s in seniority
    ])

    # Horas extra
    cantidad_horas_extra_mes = np.clip(
        np.random.exponential(p["horas_extra_media"], n).astype(int), 0, 45
    )

    # Capacitacion
    capacitacion_ultimo_anio = np.random.choice(
        ["Si", "No"],
        size=n,
        p=[p["tasa_capacitacion"], 1 - p["tasa_capacitacion"]]
    )

    # Evaluacion desempeno
    evaluacion_desempeno = np.clip(
        np.random.normal(p.get("desempeno_media", 3.5), 0.8, n).round().astype(int), 1, 5
    )

    # Empresas anteriores
    cantidad_empresas_anteriores = np.clip(np.random.poisson(2, n), 0, 8)

    # Satisfaccion laboral
    satisfaccion_laboral = np.clip(
        np.random.normal(p["satisfaccion_media"], 1.0, n).round().astype(int), 1, 5
    )

    # Satisfaccion ambiente
    satisfaccion_ambiente = np.clip(
        np.random.normal(p.get("ambiente_media", p["satisfaccion_media"]), 0.9, n).round().astype(int), 1, 5
    )

    # Equilibrio vida-trabajo (correlacion con horas extra)
    equilibrio_base = np.random.normal(p.get("equilibrio_media", 3.5), 0.9, n)
    penalty_horas = cantidad_horas_extra_mes * 0.05
    equilibrio_vida_trabajo = np.clip(
        (equilibrio_base - penalty_horas).round().astype(int), 1, 5
    )

    # Estancamiento
    estancamiento_base = np.random.normal(p.get("estancamiento_media", 2.5), 1.0, n)
    penalty_antig = np.where(antiguedad_meses > 36, 0.5, 0)
    penalty_cap = np.where(capacitacion_ultimo_anio == "No", 0.4, 0)
    estancamiento_carrera = np.clip(
        (estancamiento_base + penalty_antig + penalty_cap).round().astype(int), 1, 5
    )

    # Feedback lider
    feedback_lider = np.clip(
        np.random.normal(p.get("feedback_media", 3.2), 1.0, n).round().astype(int), 1, 5
    )

    # ── Generar target: desercion ─────────────────────────────────────────
    riesgo_score = np.zeros(n, dtype=float)
    riesgo_score += (5 - satisfaccion_laboral) * 0.15
    riesgo_score += (5 - satisfaccion_ambiente) * 0.10
    riesgo_score += (5 - equilibrio_vida_trabajo) * 0.12
    riesgo_score += estancamiento_carrera * 0.14
    riesgo_score += (5 - feedback_lider) * 0.08
    riesgo_score += np.where(cantidad_horas_extra_mes > 15, 0.3, 0)
    riesgo_score += np.where(cantidad_horas_extra_mes > 25, 0.2, 0)
    riesgo_score += np.where(capacitacion_ultimo_anio == "No", 0.15, 0)
    riesgo_score += np.where(antiguedad_meses < 12, 0.2, 0)
    riesgo_score += np.where(tipo_contrato == "Eventual", 0.25, 0)
    riesgo_score += np.where(tipo_contrato == "Plazo fijo", 0.1, 0)
    riesgo_score += cantidad_empresas_anteriores * 0.04

    # Salario bajo relativo al seniority
    salario_mediana = {
        "Trainee": 4_000_000, "Junior": 6_000_000,
        "Semi-Senior": 10_000_000, "Senior": 15_000_000, "Lead": 20_000_000
    }
    for i in range(n):
        mediana = salario_mediana[seniority[i]] * factor
        if salario_mensual[i] < mediana * 0.8:
            riesgo_score[i] += 0.3
        elif salario_mensual[i] < mediana * 0.95:
            riesgo_score[i] += 0.1

    # Factores que reducen riesgo
    riesgo_score -= np.where(evaluacion_desempeno >= 4, 0.1, 0)
    riesgo_score -= np.where(antiguedad_meses > 48, 0.15, 0)
    riesgo_score -= np.where(modalidad_trabajo == "Remoto", 0.1, 0)

    # Sigmoid + ruido
    riesgo_prob = 1 / (1 + np.exp(-(riesgo_score - 2.5)))
    ruido = np.random.uniform(-0.1, 0.1, n)
    prob_final = np.clip(riesgo_prob + ruido, 0, 1)
    desercion = np.where(np.random.uniform(0, 1, n) < prob_final, "Si", "No")

    # ── Construir DataFrame ───────────────────────────────────────────────
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

    return df


# ─── Perfiles de las 5 empresas ──────────────────────────────────────────────

empresas = [
    {
        "nombre": "TechNova Solutions",
        "archivo": "technova_solutions_120.csv",
        "n": 120,
        "seed": 101,
        "perfil": {
            "edad_media": 27,
            "salario_factor": 0.95,
            "horas_extra_media": 10,
            "satisfaccion_media": 3.5,
            "ambiente_media": 3.6,
            "equilibrio_media": 3.3,
            "estancamiento_media": 2.8,
            "feedback_media": 3.0,
            "tasa_capacitacion": 0.50,
            "prob_remoto": 0.30,
            "prob_hibrido": 0.45,
            "prob_indefinido": 0.55,
            "antiguedad_media": 18,
            "seniority_dist": {
                "Trainee": 0.15, "Junior": 0.35, "Semi-Senior": 0.30,
                "Senior": 0.15, "Lead": 0.05,
            },
            "roles_dist": {
                "Frontend": 0.25, "Backend": 0.25, "Fullstack": 0.20,
                "Mobile": 0.15, "DevOps": 0.05, "QA": 0.05, "Data": 0.05,
            },
        },
    },
    {
        "nombre": "Guarani Code SRL",
        "archivo": "guarani_code_85.csv",
        "n": 85,
        "seed": 202,
        "perfil": {
            "edad_media": 26,
            "salario_factor": 0.80,
            "horas_extra_media": 15,
            "satisfaccion_media": 2.8,
            "ambiente_media": 2.7,
            "equilibrio_media": 2.5,
            "estancamiento_media": 3.2,
            "feedback_media": 2.5,
            "tasa_capacitacion": 0.25,
            "prob_remoto": 0.15,
            "prob_hibrido": 0.30,
            "prob_indefinido": 0.40,
            "antiguedad_media": 12,
            "desempeno_media": 3.2,
            "seniority_dist": {
                "Trainee": 0.20, "Junior": 0.40, "Semi-Senior": 0.25,
                "Senior": 0.10, "Lead": 0.05,
            },
            "roles_dist": {
                "Frontend": 0.20, "Backend": 0.30, "Fullstack": 0.25,
                "Mobile": 0.10, "DevOps": 0.05, "QA": 0.08, "Data": 0.02,
            },
        },
    },
    {
        "nombre": "DataPy Consulting",
        "archivo": "datapy_consulting_52.csv",
        "n": 52,
        "seed": 303,
        "perfil": {
            "edad_media": 33,
            "edad_std": 6,
            "salario_factor": 1.20,
            "horas_extra_media": 6,
            "satisfaccion_media": 3.8,
            "ambiente_media": 4.0,
            "equilibrio_media": 4.0,
            "estancamiento_media": 2.0,
            "feedback_media": 3.8,
            "tasa_capacitacion": 0.70,
            "prob_remoto": 0.45,
            "prob_hibrido": 0.40,
            "prob_indefinido": 0.80,
            "antiguedad_media": 30,
            "desempeno_media": 3.8,
            "formacion_dist": [0.02, 0.08, 0.50, 0.40],
            "seniority_dist": {
                "Trainee": 0.05, "Junior": 0.10, "Semi-Senior": 0.30,
                "Senior": 0.35, "Lead": 0.20,
            },
            "roles_dist": {
                "Frontend": 0.10, "Backend": 0.20, "Fullstack": 0.15,
                "Mobile": 0.05, "DevOps": 0.15, "QA": 0.05, "Data": 0.30,
            },
        },
    },
    {
        "nombre": "AppMakers Paraguay",
        "archivo": "appmakers_paraguay_345.csv",
        "n": 345,
        "seed": 404,
        "perfil": {
            "edad_media": 29,
            "salario_factor": 1.00,
            "horas_extra_media": 9,
            "satisfaccion_media": 3.3,
            "ambiente_media": 3.3,
            "equilibrio_media": 3.2,
            "estancamiento_media": 2.7,
            "feedback_media": 3.1,
            "tasa_capacitacion": 0.45,
            "prob_remoto": 0.25,
            "prob_hibrido": 0.40,
            "prob_indefinido": 0.65,
            "antiguedad_media": 22,
            "seniority_dist": {
                "Trainee": 0.10, "Junior": 0.25, "Semi-Senior": 0.35,
                "Senior": 0.20, "Lead": 0.10,
            },
            "roles_dist": {
                "Frontend": 0.18, "Backend": 0.22, "Fullstack": 0.20,
                "Mobile": 0.15, "DevOps": 0.10, "QA": 0.10, "Data": 0.05,
            },
        },
    },
    {
        "nombre": "CloudSoft SACI",
        "archivo": "cloudsoft_saci_178.csv",
        "n": 178,
        "seed": 505,
        "perfil": {
            "edad_media": 30,
            "salario_factor": 1.10,
            "horas_extra_media": 7,
            "satisfaccion_media": 3.6,
            "ambiente_media": 3.7,
            "equilibrio_media": 3.8,
            "estancamiento_media": 2.3,
            "feedback_media": 3.5,
            "tasa_capacitacion": 0.60,
            "prob_remoto": 0.55,
            "prob_hibrido": 0.30,
            "prob_indefinido": 0.70,
            "antiguedad_media": 26,
            "desempeno_media": 3.6,
            "seniority_dist": {
                "Trainee": 0.05, "Junior": 0.20, "Semi-Senior": 0.35,
                "Senior": 0.25, "Lead": 0.15,
            },
            "roles_dist": {
                "Frontend": 0.10, "Backend": 0.20, "Fullstack": 0.15,
                "Mobile": 0.05, "DevOps": 0.30, "QA": 0.08, "Data": 0.12,
            },
        },
    },
]


# ─── Generar y guardar ────────────────────────────────────────────────────────

print("=" * 60)
print("Generando datasets para 5 empresas de prueba")
print("=" * 60)

for emp in empresas:
    df = generar_empresa(emp["nombre"], emp["n"], emp["seed"], emp["perfil"])
    path = os.path.join(OUTPUT_DIR, emp["archivo"])
    df.to_csv(path, index=False)

    tasa = (df["desercion"] == "Si").mean()
    salario_prom = df["salario_mensual"].mean()
    satisf_prom = df["satisfaccion_laboral"].mean()

    print(f"\n{emp['nombre']}")
    print(f"  Archivo: {path}")
    print(f"  Empleados: {emp['n']}")
    print(f"  Tasa desercion: {tasa:.1%}")
    print(f"  Salario promedio: Gs. {salario_prom:,.0f}")
    print(f"  Satisfaccion promedio: {satisf_prom:.2f}/5")
    print(f"  Seniority mas comun: {df['seniority'].mode().iloc[0]}")
    print(f"  Rol mas comun: {df['rol_tecnologico'].mode().iloc[0]}")

print("\n" + "=" * 60)
print("Todos los datasets generados exitosamente!")
print("=" * 60)
