"""
Modelo heuristico base para desarrollo.

Simula la logica que el modelo Random Forest real aprendera del dataset
de desercion de empresas de software de Paraguay.

Usa reglas basadas en factores de riesgo conocidos en la literatura
de retencion de talento IT, adaptadas al contexto paraguayo.

Se usa cuando el modelo real (model.pkl) aun no fue entrenado.
"""

import numpy as np


def predict_desercion_dummy(features: dict) -> tuple[float, float]:
    """
    Calcula el riesgo de desercion de forma heuristica.

    Args:
        features: dict con las 17 variables del empleado

    Returns:
        (riesgo_desercion, confianza) -- ambos entre 0.0 y 1.0
    """
    score = 0.0
    weight_total = 0.0

    def add(value, weight):
        nonlocal score, weight_total
        score += value * weight
        weight_total += weight

    # ── Factores de riesgo (variables psicometricas) ──────────────────────────

    # Baja satisfaccion laboral (escala 1-5, invertida)
    satisf = features.get("satisfaccion_laboral", 3)
    add((5 - satisf) / 4, weight=0.18)

    # Baja satisfaccion con el ambiente
    amb = features.get("satisfaccion_ambiente", 3)
    add((5 - amb) / 4, weight=0.10)

    # Mal equilibrio vida-trabajo
    equil = features.get("equilibrio_vida_trabajo", 3)
    add((5 - equil) / 4, weight=0.15)

    # Estancamiento de carrera (directo, mas = peor)
    estanc = features.get("estancamiento_carrera", 3)
    add((estanc - 1) / 4, weight=0.15)

    # Bajo feedback del lider (invertido)
    feed = features.get("feedback_lider", 3)
    add((5 - feed) / 4, weight=0.08)

    # ── Factores de riesgo (datos de RRHH) ────────────────────────────────────

    # Muchas horas extra
    horas = features.get("cantidad_horas_extra_mes", 0)
    horas_norm = min(horas / 40, 1.0)
    add(horas_norm, weight=0.12)

    # Sin capacitacion
    cap = features.get("capacitacion_ultimo_anio", "Si")
    add(1.0 if cap == "No" else 0.0, weight=0.05)

    # Poca antiguedad (< 12 meses = mas riesgo)
    antig = features.get("antiguedad_meses", 12)
    antig_norm = max(0.0, 1.0 - antig / 36)
    add(antig_norm, weight=0.07)

    # Muchas empresas anteriores
    empresas = features.get("cantidad_empresas_anteriores", 2)
    empresas_norm = min(empresas / 8, 1.0)
    add(empresas_norm, weight=0.05)

    # Contrato precario
    contrato = features.get("tipo_contrato", "Indefinido")
    if contrato == "Eventual":
        add(0.8, weight=0.05)
    elif contrato == "Plazo fijo":
        add(0.4, weight=0.05)
    else:
        add(0.0, weight=0.05)

    # ── Score final ───────────────────────────────────────────────────────────
    raw_score = score / weight_total if weight_total > 0 else 0.5

    # Ruido pequeno para que no sea determinístico
    noise = np.random.normal(0, 0.02)
    riesgo = float(np.clip(raw_score + noise, 0.0, 1.0))

    # Confianza del dummy siempre moderada-baja
    confianza = 0.55

    return riesgo, confianza


# Mantener compatibilidad con imports anteriores
predict_flight_risk = predict_desercion_dummy
