#!/usr/bin/env python3
"""Entrena el modelo ML de la empresa demo (comp-demo-1) con un dataset
sintético con señal realista, para poder evidenciar predicción/estado."""
import json, random, urllib.request

ML = "http://localhost:8000"
COMPANY = "comp-demo-1"
random.seed(42)

roles = ["Frontend","Backend","Fullstack","Mobile","DevOps","QA","Data"]
senior = ["Trainee","Junior","Semi-Senior","Senior","Lead"]
modal = ["Presencial","Hibrido","Remoto"]
contrato = ["Indefinido","Plazo fijo","Eventual"]
formacion = ["Secundaria","Tecnico","Universitario","Posgrado"]

def make_row(desercion: bool):
    if desercion:
        # perfil de riesgo: baja satisfacción, muchas horas extra, estancamiento alto
        sat = random.randint(1,2); amb = random.randint(1,3)
        eq = random.randint(1,2); est = random.randint(4,5); fb = random.randint(1,2)
        horas = random.randint(20,45); antig = random.randint(1,14)
        salario = random.randint(3000000,6000000)
        contr = random.choice(["Plazo fijo","Eventual","Indefinido"])
        cap = "No" if random.random()<0.7 else "Si"
        evalu = random.randint(2,3)
    else:
        sat = random.randint(3,5); amb = random.randint(3,5)
        eq = random.randint(3,5); est = random.randint(1,2); fb = random.randint(3,5)
        horas = random.randint(0,12); antig = random.randint(18,120)
        salario = random.randint(8000000,20000000)
        contr = "Indefinido"
        cap = "Si" if random.random()<0.7 else "No"
        evalu = random.randint(3,5)
    return {
        "edad": random.randint(22,55),
        "antiguedad_meses": antig,
        "salario_mensual": salario,
        "cantidad_horas_extra_mes": horas,
        "evaluacion_desempeno": evalu,
        "cantidad_empresas_anteriores": random.randint(0,6),
        "satisfaccion_laboral": sat,
        "satisfaccion_ambiente": amb,
        "equilibrio_vida_trabajo": eq,
        "estancamiento_carrera": est,
        "feedback_lider": fb,
        "nivel_formacion": random.choice(formacion),
        "rol_tecnologico": random.choice(roles),
        "seniority": random.choice(senior),
        "modalidad_trabajo": random.choice(modal),
        "tipo_contrato": contr,
        "capacitacion_ultimo_anio": cap,
        "desercion": "Si" if desercion else "No",
    }

rows = [make_row(True) for _ in range(60)] + [make_row(False) for _ in range(60)]
# Introducir ruido de etiqueta (~15%) para que el modelo no sea perfecto y las
# métricas sean realistas (AUC ~0.85-0.90), como en un dataset real.
for r in rows:
    if random.random() < 0.15:
        r["desercion"] = "No" if r["desercion"] == "Si" else "Si"
random.shuffle(rows)
payload = json.dumps({"company_id": COMPANY, "rows": rows}).encode()

req = urllib.request.Request(f"{ML}/api/train/dataset", data=payload,
                             headers={"Content-Type":"application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
    print(f"Entrenamiento OK ({len(rows)} filas: 60 deserción / 60 permanencia)")
    print(f"  AUC-ROC        : {data['auc_roc']}")
    print(f"  Accuracy       : {data['accuracy']}")
    print(f"  Precision (fuga): {data['precision_class1']}")
    print(f"  Recall (fuga)   : {data['recall_class1']}")
    print(f"  F1 (fuga)       : {data['f1_class1']}")
    print(f"  Matriz confusión: TN={data['confusion_matrix']['true_negative']} "
          f"FP={data['confusion_matrix']['false_positive']} "
          f"FN={data['confusion_matrix']['false_negative']} "
          f"TP={data['confusion_matrix']['true_positive']}")
    print(f"  Muestras train/test: {data['training_samples']}/{data['test_samples']}")
    print(f"  Tiempo (s)      : {data['training_time_seconds']}")
    print(f"  Versión modelo  : {data['model_version']}")
    top = sorted(data['feature_importances'], key=lambda x:-x['importance'])[:5]
    print("  Top 5 features:")
    for f in top:
        print(f"    - {f['label']}: {f['importance_pct']}% ({f['tier']})")
except Exception as e:
    print("ERROR entrenando:", e)
    import traceback; traceback.print_exc()
