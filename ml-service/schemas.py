from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums para variables categoricas ────────────────────────────────────────

class NivelFormacion(str, Enum):
    SECUNDARIA = "Secundaria"
    TECNICO = "Tecnico"
    UNIVERSITARIO = "Universitario"
    POSGRADO = "Posgrado"


class RolTecnologico(str, Enum):
    FRONTEND = "Frontend"
    BACKEND = "Backend"
    FULLSTACK = "Fullstack"
    MOBILE = "Mobile"
    DEVOPS = "DevOps"
    QA = "QA"
    DATA = "Data"


class Seniority(str, Enum):
    TRAINEE = "Trainee"
    JUNIOR = "Junior"
    SEMI_SENIOR = "Semi-Senior"
    SENIOR = "Senior"
    LEAD = "Lead"


class ModalidadTrabajo(str, Enum):
    PRESENCIAL = "Presencial"
    HIBRIDO = "Hibrido"
    REMOTO = "Remoto"


class TipoContrato(str, Enum):
    INDEFINIDO = "Indefinido"
    PLAZO_FIJO = "Plazo fijo"
    EVENTUAL = "Eventual"


# ─── Schema principal de features del empleado ────────────────────────────────

class EmployeeFeatures(BaseModel):
    """
    Variables de entrada para el modelo de prediccion de desercion.
    Basado en dataset custom para empresas de desarrollo de software
    de Asuncion, Paraguay.

    Las variables se dividen en dos fuentes:
    - Datos de RRHH (la empresa los tiene en su sistema)
    - Encuesta clima (la empresa les pregunta a sus empleados)

    Variables marcadas como opcionales pueden quedar sin completar,
    pero se recomienda cargarlas para mejorar la precision del modelo.
    """

    # ── Datos de RRHH (la empresa los tiene) ──────────────────────────────────

    edad: int = Field(
        ..., ge=18, le=65,
        description="Edad del empleado en anios",
        json_schema_extra={"example": 28}
    )
    nivel_formacion: NivelFormacion = Field(
        ...,
        description="Nivel educativo mas alto alcanzado",
        json_schema_extra={"example": "Universitario"}
    )
    rol_tecnologico: RolTecnologico = Field(
        ...,
        description="Rol principal del empleado en el equipo de desarrollo",
        json_schema_extra={"example": "Backend"}
    )
    seniority: Seniority = Field(
        ...,
        description="Nivel de experiencia y responsabilidad",
        json_schema_extra={"example": "Semi-Senior"}
    )
    antiguedad_meses: int = Field(
        ..., ge=0, le=360,
        description="Meses que lleva el empleado en la empresa actual",
        json_schema_extra={"example": 18}
    )
    modalidad_trabajo: ModalidadTrabajo = Field(
        ...,
        description="Modalidad contractual de trabajo",
        json_schema_extra={"example": "Hibrido"}
    )
    tipo_contrato: TipoContrato = Field(
        ...,
        description="Tipo de contrato laboral vigente",
        json_schema_extra={"example": "Indefinido"}
    )
    salario_mensual: int = Field(
        ..., gt=0,
        description="Salario mensual en guaranies (Gs.)",
        json_schema_extra={"example": 8500000}
    )
    cantidad_horas_extra_mes: int = Field(
        ..., ge=0, le=80,
        description="Promedio de horas extra mensuales trabajadas",
        json_schema_extra={"example": 10}
    )
    capacitacion_ultimo_anio: bool = Field(
        ...,
        description="Si el empleado recibio alguna capacitacion formal en los ultimos 12 meses",
        json_schema_extra={"example": True}
    )
    evaluacion_desempeno: int = Field(
        ..., ge=1, le=5,
        description="Ultima calificacion de evaluacion de desempeno (1=Muy bajo, 5=Excelente)",
        json_schema_extra={"example": 4}
    )
    cantidad_empresas_anteriores: int = Field(
        ..., ge=0, le=15,
        description="Numero de empresas donde trabajo antes de la actual",
        json_schema_extra={"example": 2}
    )

    # ── Encuesta clima interna (la empresa pregunta a empleados) ──────────────
    # Estas variables son OPCIONALES pero ALTAMENTE recomendadas.
    # Sin ellas, el modelo pierde precision significativamente.

    satisfaccion_laboral: Optional[int] = Field(
        None, ge=1, le=5,
        description=(
            "Satisfaccion del empleado con su trabajo (1=Muy baja, 5=Muy alta). "
            "IMPORTANTE: Variable de alto impacto en la prediccion. "
            "Se obtiene de encuesta de clima interna."
        ),
        json_schema_extra={"example": 3}
    )
    satisfaccion_ambiente: Optional[int] = Field(
        None, ge=1, le=5,
        description=(
            "Satisfaccion con el ambiente y entorno laboral (1=Muy baja, 5=Muy alta). "
            "Se obtiene de encuesta de clima interna."
        ),
        json_schema_extra={"example": 4}
    )
    equilibrio_vida_trabajo: Optional[int] = Field(
        None, ge=1, le=5,
        description=(
            "Percepcion de equilibrio entre vida personal y trabajo (1=Muy malo, 5=Muy bueno). "
            "IMPORTANTE: Variable de alto impacto en la prediccion. "
            "Se obtiene de encuesta de clima interna."
        ),
        json_schema_extra={"example": 3}
    )
    estancamiento_carrera: Optional[int] = Field(
        None, ge=1, le=5,
        description=(
            "Percepcion de estancamiento profesional (1=Nada estancado, 5=Muy estancado). "
            "IMPORTANTE: Variable de alto impacto en la prediccion. "
            "Se obtiene de encuesta de clima interna."
        ),
        json_schema_extra={"example": 2}
    )
    feedback_lider: Optional[int] = Field(
        None, ge=1, le=5,
        description=(
            "Calidad de retroalimentacion recibida del lider directo (1=Muy mala, 5=Muy buena). "
            "Se obtiene de encuesta de clima interna."
        ),
        json_schema_extra={"example": 3}
    )

    class Config:
        json_schema_extra = {
            "example": {
                "edad": 28,
                "nivel_formacion": "Universitario",
                "rol_tecnologico": "Backend",
                "seniority": "Semi-Senior",
                "antiguedad_meses": 18,
                "modalidad_trabajo": "Hibrido",
                "tipo_contrato": "Indefinido",
                "salario_mensual": 8500000,
                "cantidad_horas_extra_mes": 10,
                "capacitacion_ultimo_anio": True,
                "evaluacion_desempeno": 4,
                "cantidad_empresas_anteriores": 2,
                "satisfaccion_laboral": 3,
                "satisfaccion_ambiente": 4,
                "equilibrio_vida_trabajo": 3,
                "estancamiento_carrera": 2,
                "feedback_lider": 3,
            }
        }


# ─── Resultado de prediccion ─────────────────────────────────────────────────

class PredictionResult(BaseModel):
    """Resultado de la prediccion de riesgo de desercion."""
    riesgo_desercion: float = Field(
        ...,
        description="Probabilidad de desercion (0.0 a 1.0)"
    )
    nivel_riesgo: str = Field(
        ...,
        description="Nivel de riesgo: BAJO, MEDIO, ALTO, CRITICO"
    )
    confianza: float = Field(
        ...,
        description="Confianza del modelo en la prediccion (0.0 a 1.0)"
    )
    version_modelo: str = Field(
        ...,
        description="Version del modelo utilizado"
    )
    es_modelo_base: bool = Field(
        ...,
        description="True si se usa el modelo heuristico base (sin entrenamiento real)"
    )
    variables_faltantes: list[str] = Field(
        default_factory=list,
        description=(
            "Lista de variables opcionales que no fueron proporcionadas. "
            "El modelo usa valores por defecto (neutros) para estas, "
            "lo que reduce la precision de la prediccion."
        )
    )
    recomendacion: str = Field(
        default="",
        description="Recomendacion breve basada en el nivel de riesgo"
    )
