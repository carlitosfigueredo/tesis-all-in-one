import os
import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from model.dummy_model import predict_desercion_dummy
from routers.training import (
    FEATURES_NUMERICAS, FEATURES_CATEGORICAS,
    MODEL_PATH, ENCODERS_PATH, DATASET_PATH,
    FEATURE_LABELS,
)

router = APIRouter(tags=["Empleados"])


# ─── Schemas de respuesta ────────────────────────────────────────────────────

class Employee(BaseModel):
    """Representa un empleado del dataset con su prediccion de riesgo."""
    id: int
    edad: int
    nivel_formacion: str
    rol_tecnologico: str
    seniority: str
    antiguedad_meses: int
    modalidad_trabajo: str
    tipo_contrato: str
    salario_mensual: int
    cantidad_horas_extra_mes: int
    capacitacion_ultimo_anio: bool
    evaluacion_desempeno: int
    cantidad_empresas_anteriores: int
    satisfaccion_laboral: int
    satisfaccion_ambiente: int
    equilibrio_vida_trabajo: int
    estancamiento_carrera: int
    feedback_lider: int
    desercion_real: bool          # Valor real del dataset (para validacion)
    riesgo_desercion: float       # Calculado por el modelo
    nivel_riesgo: str             # CRITICO, ALTO, MEDIO, BAJO
    es_modelo_base: bool


class EmployeeListResponse(BaseModel):
    data: list[Employee]
    total: int
    page: int
    page_size: int
    total_pages: int


class EmployeeStats(BaseModel):
    total: int
    riesgo_critico: int
    riesgo_alto: int
    riesgo_medio: int
    riesgo_bajo: int
    tasa_desercion_real: float
    salario_promedio: int
    antiguedad_promedio_meses: int
    satisfaccion_promedio: float
    riesgo_por_area: list[dict]
    riesgo_por_seniority: list[dict]
    riesgo_por_modalidad: list[dict]
    es_modelo_base: bool


# ─── Funciones auxiliares ────────────────────────────────────────────────────

def _load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def _load_encoders():
    if os.path.exists(ENCODERS_PATH):
        return joblib.load(ENCODERS_PATH)
    return None


def _get_nivel_riesgo(score: float) -> str:
    if score >= 0.75:
        return "CRITICO"
    if score >= 0.50:
        return "ALTO"
    if score >= 0.30:
        return "MEDIO"
    return "BAJO"


def _calc_riesgo_batch(df: pd.DataFrame, model, encoders) -> tuple[list[float], bool]:
    """
    Calcula el riesgo de desercion para todo un DataFrame (vectorizado).
    Retorna (lista_de_riesgos, es_modelo_base).
    """
    if model is not None and encoders is not None:
        # Preparar features en el orden correcto
        all_features = FEATURES_NUMERICAS + FEATURES_CATEGORICAS
        feat_df = df[all_features].copy()

        # Codificar categoricas
        for col in FEATURES_CATEGORICAS:
            if col in encoders:
                le = encoders[col]
                known = set(le.classes_)
                feat_df[col] = feat_df[col].apply(
                    lambda x: le.transform([str(x)])[0] if str(x) in known else 0
                )

        probs = model.predict_proba(feat_df)[:, 1]
        return [round(float(p), 4) for p in probs], False
    else:
        # Modelo heuristico base: fila a fila
        risks = []
        for _, row in df.iterrows():
            risk, _ = predict_desercion_dummy(row.to_dict())
            risks.append(round(risk, 4))
        return risks, True


def _calc_riesgo_single(row: pd.Series, model, encoders) -> tuple[float, bool]:
    """Calcula el riesgo para una sola fila."""
    df_single = pd.DataFrame([row])
    risks, is_base = _calc_riesgo_batch(df_single, model, encoders)
    return risks[0], is_base


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/employees/stats", response_model=EmployeeStats)
def get_employees_stats():
    """
    Devuelve estadisticas globales del dataset con predicciones.
    Usa prediccion vectorizada (batch) para rendimiento.
    """
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="Dataset no disponible")

    df = pd.read_csv(DATASET_PATH)
    model = _load_model()
    encoders = _load_encoders()

    total = len(df)

    # Prediccion vectorizada
    risks, is_base = _calc_riesgo_batch(df, model, encoders)
    df["_riesgo"] = risks
    df["_nivel"]  = df["_riesgo"].apply(_get_nivel_riesgo)

    riesgo_critico = int((df["_nivel"] == "CRITICO").sum())
    riesgo_alto = int((df["_nivel"] == "ALTO").sum())
    riesgo_medio = int((df["_nivel"] == "MEDIO").sum())
    riesgo_bajo = int((df["_nivel"] == "BAJO").sum())

    tasa_desercion = round(float((df["desercion"] == "Si").mean()), 4)
    salario_promedio = int(df["salario_mensual"].mean())
    antiguedad_promedio = int(df["antiguedad_meses"].mean())
    satisfaccion_promedio = round(float(df["satisfaccion_laboral"].mean()), 2)

    # Riesgo promedio por area/rol
    riesgo_por_area = (
        df.groupby("rol_tecnologico")["_riesgo"]
        .mean()
        .round(4)
        .reset_index()
        .rename(columns={"rol_tecnologico": "area", "_riesgo": "riesgo_promedio"})
        .to_dict(orient="records")
    )

    # Riesgo promedio por seniority
    riesgo_por_seniority = (
        df.groupby("seniority")["_riesgo"]
        .mean()
        .round(4)
        .reset_index()
        .rename(columns={"_riesgo": "riesgo_promedio"})
        .to_dict(orient="records")
    )

    # Riesgo promedio por modalidad
    riesgo_por_modalidad = (
        df.groupby("modalidad_trabajo")["_riesgo"]
        .mean()
        .round(4)
        .reset_index()
        .rename(columns={"modalidad_trabajo": "modalidad", "_riesgo": "riesgo_promedio"})
        .to_dict(orient="records")
    )

    return EmployeeStats(
        total=total,
        riesgo_critico=riesgo_critico,
        riesgo_alto=riesgo_alto,
        riesgo_medio=riesgo_medio,
        riesgo_bajo=riesgo_bajo,
        tasa_desercion_real=tasa_desercion,
        salario_promedio=salario_promedio,
        antiguedad_promedio_meses=antiguedad_promedio,
        satisfaccion_promedio=satisfaccion_promedio,
        riesgo_por_area=riesgo_por_area,
        riesgo_por_seniority=riesgo_por_seniority,
        riesgo_por_modalidad=riesgo_por_modalidad,
        es_modelo_base=is_base,
    )


@router.get("/employees", response_model=EmployeeListResponse)
def get_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    rol_tecnologico: Optional[str] = Query(None),
    seniority: Optional[str] = Query(None),
    modalidad: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None),  # CRITICO | ALTO | MEDIO | BAJO
    desercion: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Devuelve la lista de empleados del dataset con su riesgo de desercion calculado.
    Soporta paginacion y filtros por rol, seniority, modalidad, nivel de riesgo.
    """
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="Dataset no disponible")

    df = pd.read_csv(DATASET_PATH)
    df = df.reset_index(drop=True)
    df["_id"] = df.index + 1  # ID sintetico basado en posicion

    model = _load_model()
    encoders = _load_encoders()

    # Filtros previos a prediccion
    if rol_tecnologico:
        df = df[df["rol_tecnologico"].str.lower() == rol_tecnologico.lower()]
    if seniority:
        df = df[df["seniority"].str.lower() == seniority.lower()]
    if modalidad:
        df = df[df["modalidad_trabajo"].str.lower() == modalidad.lower()]
    if desercion is not None:
        df = df[df["desercion"] == ("Si" if desercion else "No")]
    if search:
        mask = (
            df["rol_tecnologico"].str.lower().str.contains(search.lower(), na=False) |
            df["seniority"].str.lower().str.contains(search.lower(), na=False) |
            df["nivel_formacion"].str.lower().str.contains(search.lower(), na=False)
        )
        df = df[mask]

    # Calcular riesgo para todas las filas filtradas
    if len(df) > 0:
        risks, is_base = _calc_riesgo_batch(df, model, encoders)
        df["_riesgo"] = risks
        df["_nivel"] = df["_riesgo"].apply(_get_nivel_riesgo)
    else:
        df["_riesgo"] = []
        df["_nivel"] = []
        is_base = True

    # Filtro por nivel de riesgo (post-calculo)
    if nivel_riesgo:
        df = df[df["_nivel"] == nivel_riesgo.upper()]

    total = len(df)

    # Paginacion
    start = (page - 1) * page_size
    end = start + page_size
    df_page = df.iloc[start:end]

    employees = []
    for _, row in df_page.iterrows():
        employees.append(Employee(
            id=int(row["_id"]),
            edad=int(row["edad"]),
            nivel_formacion=row["nivel_formacion"],
            rol_tecnologico=row["rol_tecnologico"],
            seniority=row["seniority"],
            antiguedad_meses=int(row["antiguedad_meses"]),
            modalidad_trabajo=row["modalidad_trabajo"],
            tipo_contrato=row["tipo_contrato"],
            salario_mensual=int(row["salario_mensual"]),
            cantidad_horas_extra_mes=int(row["cantidad_horas_extra_mes"]),
            capacitacion_ultimo_anio=row["capacitacion_ultimo_anio"] == "Si",
            evaluacion_desempeno=int(row["evaluacion_desempeno"]),
            cantidad_empresas_anteriores=int(row["cantidad_empresas_anteriores"]),
            satisfaccion_laboral=int(row["satisfaccion_laboral"]),
            satisfaccion_ambiente=int(row["satisfaccion_ambiente"]),
            equilibrio_vida_trabajo=int(row["equilibrio_vida_trabajo"]),
            estancamiento_carrera=int(row["estancamiento_carrera"]),
            feedback_lider=int(row["feedback_lider"]),
            desercion_real=row["desercion"] == "Si",
            riesgo_desercion=float(row["_riesgo"]),
            nivel_riesgo=row["_nivel"],
            es_modelo_base=is_base,
        ))

    total_pages = max(1, (total + page_size - 1) // page_size)

    return EmployeeListResponse(
        data=employees,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/employees/{employee_id}", response_model=Employee)
def get_employee(employee_id: int):
    """Devuelve el detalle completo de un empleado por su ID."""
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="Dataset no disponible")

    df = pd.read_csv(DATASET_PATH)
    df = df.reset_index(drop=True)
    df["_id"] = df.index + 1

    row_df = df[df["_id"] == employee_id]
    if row_df.empty:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    row = row_df.iloc[0]
    model = _load_model()
    encoders = _load_encoders()
    riesgo, is_base = _calc_riesgo_single(row, model, encoders)

    return Employee(
        id=int(row["_id"]),
        edad=int(row["edad"]),
        nivel_formacion=row["nivel_formacion"],
        rol_tecnologico=row["rol_tecnologico"],
        seniority=row["seniority"],
        antiguedad_meses=int(row["antiguedad_meses"]),
        modalidad_trabajo=row["modalidad_trabajo"],
        tipo_contrato=row["tipo_contrato"],
        salario_mensual=int(row["salario_mensual"]),
        cantidad_horas_extra_mes=int(row["cantidad_horas_extra_mes"]),
        capacitacion_ultimo_anio=row["capacitacion_ultimo_anio"] == "Si",
        evaluacion_desempeno=int(row["evaluacion_desempeno"]),
        cantidad_empresas_anteriores=int(row["cantidad_empresas_anteriores"]),
        satisfaccion_laboral=int(row["satisfaccion_laboral"]),
        satisfaccion_ambiente=int(row["satisfaccion_ambiente"]),
        equilibrio_vida_trabajo=int(row["equilibrio_vida_trabajo"]),
        estancamiento_carrera=int(row["estancamiento_carrera"]),
        feedback_lider=int(row["feedback_lider"]),
        desercion_real=row["desercion"] == "Si",
        riesgo_desercion=riesgo,
        nivel_riesgo=_get_nivel_riesgo(riesgo),
        es_modelo_base=is_base,
    )
