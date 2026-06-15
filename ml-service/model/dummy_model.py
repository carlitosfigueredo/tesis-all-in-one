"""
Modelo dummy para desarrollo.

Simula la lógica que el modelo real de Random Forest aprenderá del dataset IBM.
Usa reglas heurísticas basadas en los factores de riesgo conocidos en la literatura
de retención de talento, para que las predicciones sean plausibles mientras
se entrena el modelo real.

Reemplazar este archivo por model.pkl una vez completado el notebook de entrenamiento.
"""

import numpy as np


def predict_flight_risk(features: dict) -> tuple[float, float]:
    """
    Calcula el riesgo de fuga de forma heurística.

    Returns:
        (flight_risk, confidence) — ambos entre 0.0 y 1.0
    """
    score = 0.0
    weight_total = 0.0

    def add(value, weight):
        nonlocal score, weight_total
        score += value * weight
        weight_total += weight

    # ── Factores de riesgo con sus pesos ──────────────────────────────────────

    # Baja satisfacción laboral (escala 1-4, invertida)
    add((4 - features["job_satisfaction"]) / 3, weight=0.20)

    # Baja satisfacción con el ambiente (escala 1-4, invertida)
    add((4 - features["environment_satisfaction"]) / 3, weight=0.15)

    # Mal balance vida-trabajo (escala 1-4, invertida)
    add((4 - features["work_life_balance"]) / 3, weight=0.15)

    # Horas extra → fuerte predictor de fuga
    add(1.0 if features["overtime"] else 0.0, weight=0.20)

    # Muchas empresas anteriores → perfil más móvil
    companies = min(features["num_companies_worked"] / 9, 1.0)
    add(companies, weight=0.10)

    # Poco tiempo en la empresa → más propenso a irse
    years_norm = max(0.0, 1.0 - features["years_at_company"] / 20)
    add(years_norm, weight=0.10)

    # Sin ascenso reciente → desmotivación
    promotion_norm = min(features["years_since_last_promotion"] / 10, 1.0)
    add(promotion_norm, weight=0.05)

    # Distancia al trabajo lejana
    distance_norm = min(features["distance_from_home"] / 30, 1.0)
    add(distance_norm, weight=0.05)

    # ── Score final ───────────────────────────────────────────────────────────
    raw_score = score / weight_total if weight_total > 0 else 0.5

    # Añadir ruido pequeño para que no se vea demasiado determinístico
    noise = np.random.normal(0, 0.02)
    flight_risk = float(np.clip(raw_score + noise, 0.0, 1.0))

    # Confianza del dummy siempre baja (honesto con el estado del modelo)
    confidence = 0.55

    return flight_risk, confidence
