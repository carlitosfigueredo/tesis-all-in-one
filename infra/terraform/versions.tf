# ─────────────────────────────────────────────────────────────
# Versiones de Terraform y proveedores
# ─────────────────────────────────────────────────────────────
terraform {
  required_version = ">= 1.10.0" # use_lockfile (bloqueo nativo S3) requiere 1.10+

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
