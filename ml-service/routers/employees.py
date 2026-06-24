import os
import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from model.dummy_model import predict_flight_risk as dummy_predict

router = APIRouter(tags=["Empleados"])

DATASET_PATH = "notebooks/data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
MODEL_PATH   = "model/model.pkl"

FEATURES = [
    "Age", "MonthlyIncome", "YearsAtCompany", "YearsInCurrentRole",
    "YearsSinceLastPromotion", "JobSatisfaction", "EnvironmentSatisfaction",
    "WorkLifeBalance", "NumCompaniesWorked", "OverTime",
    "DistanceFromHome", "PerformanceRating",
]

DEPT_MAP = {
    "Sales":                  "Ventas",
    "Research & Development": "I+D",
    "Human Resources":        "Recursos Humanos",
}
TRAVEL_MAP = {
    "Non-Travel":        "Sin viajes",
    "Travel_Rarely":     "Viaja poco",
    "Travel_Frequently": "Viaja frecuente",
}


class Employee(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    department: str
    job_role: str
    job_level: int
    monthly_income: int
    years_at_company: int
    years_in_current_role: int
    years_since_last_promotion: int
    total_working_years: int
    num_companies_worked: int
    distance_from_home: int
    overtime: bool
    business_travel: str
    job_satisfaction: int
    environment_satisfaction: int
    work_life_balance: int
    performance_rating: int
    education: int
    education_field: str
    marital_status: str
    attrition: bool           # Valor real del dataset
    flight_risk: float        # Calculado por el modelo
    risk_level: str
    is_dummy: bool


class EmployeeListResponse(BaseModel):
    data: list[Employee]
    total: int
    page: int
    page_size: int
    total_pages: int


def _load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def _get_risk_level(score: float) -> str:
    if score >= 0.70: return "ALTO"
    if score >= 0.40: return "MEDIO"
    return "BAJO"


def _calc_flight_risk(row: pd.Series, model) -> tuple[float, bool]:
    features = {
        "job_satisfaction":           int(row["JobSatisfaction"]),
        "environment_satisfaction":   int(row["EnvironmentSatisfaction"]),
        "work_life_balance":          int(row["WorkLifeBalance"]),
        "overtime":                   row["OverTime"] == "Yes",
        "num_companies_worked":       int(row["NumCompaniesWorked"]),
        "years_at_company":           int(row["YearsAtCompany"]),
        "years_since_last_promotion": int(row["YearsSinceLastPromotion"]),
        "distance_from_home":         int(row["DistanceFromHome"]),
    }
    if model is not None:
        feat_array = [[
            int(row["Age"]),
            int(row["MonthlyIncome"]),
            int(row["YearsAtCompany"]),
            int(row["YearsInCurrentRole"]),
            int(row["YearsSinceLastPromotion"]),
            int(row["JobSatisfaction"]),
            int(row["EnvironmentSatisfaction"]),
            int(row["WorkLifeBalance"]),
            int(row["NumCompaniesWorked"]),
            1 if row["OverTime"] == "Yes" else 0,
            int(row["DistanceFromHome"]),
            int(row["PerformanceRating"]),
        ]]
        prob = float(model.predict_proba(feat_array)[0][1])
        return round(prob, 4), False
    else:
        risk, _ = dummy_predict(features)
        return round(risk, 4), True


@router.get("/employees", response_model=EmployeeListResponse)
def get_employees(
    page:        int = Query(1, ge=1),
    page_size:   int = Query(20, ge=5, le=100),
    department:  Optional[str] = Query(None),
    risk_level:  Optional[str] = Query(None),   # ALTO | MEDIO | BAJO
    search:      Optional[str] = Query(None),   # busca por nombre/rol
    attrition:   Optional[bool] = Query(None),  # filtra por valor real
):
    """
    Devuelve la lista de empleados del dataset IBM HR con su flightRisk calculado.
    Soporta paginación, filtros por departamento, nivel de riesgo y búsqueda.
    """
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="Dataset no disponible")

    df = pd.read_csv(DATASET_PATH)
    model = _load_model()

    # Construir nombre sintético (el dataset no tiene nombres reales)
    df["_name"] = df["JobRole"] + " #" + df["EmployeeNumber"].astype(str)

    # Filtros
    if department:
        df = df[df["Department"].str.lower() == department.lower()]
    if attrition is not None:
        df = df[df["Attrition"] == ("Yes" if attrition else "No")]
    if search:
        mask = (
            df["_name"].str.lower().str.contains(search.lower()) |
            df["JobRole"].str.lower().str.contains(search.lower()) |
            df["Department"].str.lower().str.contains(search.lower())
        )
        df = df[mask]

    total = len(df)

    # Paginación
    start = (page - 1) * page_size
    end   = start + page_size
    df_page = df.iloc[start:end]

    employees = []
    for _, row in df_page.iterrows():
        flight_risk, is_dummy = _calc_flight_risk(row, model)
        rl = _get_risk_level(flight_risk)

        # Filtro por risk_level (post-cálculo)
        if risk_level and rl != risk_level.upper():
            continue

        employees.append(Employee(
            id=int(row["EmployeeNumber"]),
            name=row["_name"],
            age=int(row["Age"]),
            gender=row["Gender"],
            department=DEPT_MAP.get(row["Department"], row["Department"]),
            job_role=row["JobRole"],
            job_level=int(row["JobLevel"]),
            monthly_income=int(row["MonthlyIncome"]),
            years_at_company=int(row["YearsAtCompany"]),
            years_in_current_role=int(row["YearsInCurrentRole"]),
            years_since_last_promotion=int(row["YearsSinceLastPromotion"]),
            total_working_years=int(row["TotalWorkingYears"]),
            num_companies_worked=int(row["NumCompaniesWorked"]),
            distance_from_home=int(row["DistanceFromHome"]),
            overtime=row["OverTime"] == "Yes",
            business_travel=TRAVEL_MAP.get(row["BusinessTravel"], row["BusinessTravel"]),
            job_satisfaction=int(row["JobSatisfaction"]),
            environment_satisfaction=int(row["EnvironmentSatisfaction"]),
            work_life_balance=int(row["WorkLifeBalance"]),
            performance_rating=int(row["PerformanceRating"]),
            education=int(row["Education"]),
            education_field=row["EducationField"],
            marital_status=row["MaritalStatus"],
            attrition=row["Attrition"] == "Yes",
            flight_risk=flight_risk,
            risk_level=rl,
            is_dummy=is_dummy,
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
    """Devuelve el detalle completo de un empleado por su EmployeeNumber."""
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="Dataset no disponible")

    df = pd.read_csv(DATASET_PATH)
    row_df = df[df["EmployeeNumber"] == employee_id]

    if row_df.empty:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    row = row_df.iloc[0]
    model = _load_model()
    flight_risk, is_dummy = _calc_flight_risk(row, model)

    return Employee(
        id=int(row["EmployeeNumber"]),
        name=row["JobRole"] + " #" + str(row["EmployeeNumber"]),
        age=int(row["Age"]),
        gender=row["Gender"],
        department=DEPT_MAP.get(row["Department"], row["Department"]),
        job_role=row["JobRole"],
        job_level=int(row["JobLevel"]),
        monthly_income=int(row["MonthlyIncome"]),
        years_at_company=int(row["YearsAtCompany"]),
        years_in_current_role=int(row["YearsInCurrentRole"]),
        years_since_last_promotion=int(row["YearsSinceLastPromotion"]),
        total_working_years=int(row["TotalWorkingYears"]),
        num_companies_worked=int(row["NumCompaniesWorked"]),
        distance_from_home=int(row["DistanceFromHome"]),
        overtime=row["OverTime"] == "Yes",
        business_travel=TRAVEL_MAP.get(row["BusinessTravel"], row["BusinessTravel"]),
        job_satisfaction=int(row["JobSatisfaction"]),
        environment_satisfaction=int(row["EnvironmentSatisfaction"]),
        work_life_balance=int(row["WorkLifeBalance"]),
        performance_rating=int(row["PerformanceRating"]),
        education=int(row["Education"]),
        education_field=row["EducationField"],
        marital_status=row["MaritalStatus"],
        attrition=row["Attrition"] == "Yes",
        flight_risk=flight_risk,
        risk_level=_get_risk_level(flight_risk),
        is_dummy=is_dummy,
    )
