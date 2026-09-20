# ─────────────────────────────────────────────────────────────
# Proveedor AWS
#
# Las credenciales NO van acá. Configuralas por fuera con:
#   - aws configure           (perfil default o --profile)
#   - o variables de entorno: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
# Terraform las toma automáticamente.
# ─────────────────────────────────────────────────────────────
provider "aws" {
  region  = var.region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
      Env       = var.environment
    }
  }
}
