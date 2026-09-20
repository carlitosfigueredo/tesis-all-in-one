# Infraestructura — EC2 Graviton (ARM) con backend de estado en S3

Terraform para desplegar una instancia **EC2 Graviton (ARM64)** con Docker + Docker
Compose, donde correr el stack del proyecto (backend, ML, frontend, Postgres, Mailhog).
El estado de Terraform se guarda de forma remota en **S3** con **bloqueo nativo**
(`use_lockfile`, Terraform 1.10+). Ya no se usa DynamoDB.

## Estructura

```
infra/terraform/
├── bootstrap/            # Crea el bucket S3 para el estado remoto
│   └── main.tf
├── backend.tf           # Config del backend remoto (apunta al bootstrap)
├── providers.tf         # Proveedor AWS
├── versions.tf          # Versiones de TF y providers
├── variables.tf         # Variables de entrada
├── network.tf           # VPC/subnet por defecto
├── security.tf          # Security group (firewall)
├── iam.tf               # Rol de instancia (SSM + envío SES)
├── ec2.tf               # Instancia Graviton + IP elástica
├── user_data.sh         # Instala Docker/Compose al arrancar
├── outputs.tf           # IP pública, comando SSH, etc.
└── terraform.tfvars.example
```

## Requisitos

- Terraform >= 1.10 (por el bloqueo nativo de estado en S3)
- AWS CLI configurado con tus access keys:
  ```
  aws configure
  ```
  (o exportá `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`)

## Paso 1 — Crear el backend remoto (una sola vez)

El bucket de estado debe existir antes de usarlo, así que primero se corre el bootstrap
(usa estado local):

```bash
cd infra/terraform/bootstrap
# Editá el nombre del bucket (debe ser único a nivel global) en main.tf o pasalo por -var
terraform init
terraform apply -var="state_bucket_name=tfstate-tesis-bi-TU-SUFIJO"
```

Anotá el output: `state_bucket`.

## Paso 2 — Configurar el backend en `backend.tf`

Pegá el nombre del bucket que devolvió el paso 1 en `../backend.tf` (campo `bucket`),
y verificá que `region` coincida. El bloqueo es nativo (`use_lockfile`), no hay tabla
que configurar.

## Paso 3 — Desplegar la EC2

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Editá terraform.tfvars: key_pair_name, ssh_allowed_cidr (tu IP), instance_type...

terraform init      # migra el estado a S3 (respondé "yes")
terraform plan
terraform apply
```

Al terminar, `terraform output` te da la IP pública y el comando de acceso.

## Paso 4 — Desplegar la app en la instancia

```bash
# Entrar (según tengas key pair o uses SSM):
ssh -i tu-key.pem ec2-user@<IP>
#   o
aws ssm start-session --target <instance-id>

# Ya adentro:
cd /opt/tesis-bi
git clone <tu-repo> .        # o copiá el proyecto con scp
cp .env.example .env         # y completá las variables (incl. SES)
docker compose up -d --build
```

## Notas

- **Arquitectura ARM**: la AMI es Amazon Linux 2023 arm64 y el Compose plugin se baja en
  `aarch64`. Tu Dockerfile usa `node:20-alpine`, que es multi-arch, así que corre nativo
  en Graviton sin cambios.
- **SES**: el rol de la instancia ya incluye permiso `ses:SendEmail`. Igual, para SMTP
  necesitás las credenciales SMTP de SES en el `.env` (ver el bloque SES del `.env`).
- **Seguridad**: cambiá `ssh_allowed_cidr` por tu IP (`x.x.x.x/32`). El SG abre los puertos
  de la app a internet porque es una demo; para prod conviene poner un reverse proxy y TLS.
- **Costos**: `t4g` es Graviton y de los más baratos. `PAY_PER_REQUEST` en DynamoDB y S3 de
  estado tienen costo casi nulo. Acordate de `terraform destroy` cuando no lo uses.

## Destruir todo

```bash
cd infra/terraform && terraform destroy
# El bucket de estado y la tabla se destruyen aparte, desde ./bootstrap
```
