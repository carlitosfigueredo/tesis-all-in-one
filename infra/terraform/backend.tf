# ─────────────────────────────────────────────────────────────
# Backend remoto de estado en S3 con bloqueo NATIVO (use_lockfile).
# Terraform >= 1.10 ya no necesita DynamoDB: usa un lock file en el
# propio bucket S3.
#
# IMPORTANTE: el bucket debe existir ANTES de correr `terraform init`
# aquí. Se crea con la carpeta ./bootstrap.
#
# Pasos:
#   1. cd bootstrap && terraform init && terraform apply
#   2. Copiá el nombre del bucket que devuelve abajo.
#   3. Volvé acá: terraform init (te va a pedir migrar el estado a S3).
# ─────────────────────────────────────────────────────────────
terraform {
  backend "s3" {
    bucket       = "sistemabi-tesis-tfstate-bucket" # = output del bootstrap
    key          = "ec2-graviton/terraform.tfstate"
    region       = "us-east-2"                     # misma región que tu SES/infra
    encrypt      = true
    use_lockfile = true # bloqueo nativo en S3 (TF >= 1.10), sin DynamoDB
  }
}
