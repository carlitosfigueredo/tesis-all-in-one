# ─────────────────────────────────────────────────────────────
# BOOTSTRAP — crea el backend remoto de Terraform (S3 + DynamoDB)
#
# Esto se corre UNA SOLA VEZ y usa estado LOCAL (no remoto todavía,
# porque justamente estamos creando el lugar donde vivirá el estado).
#
# Uso:
#   cd infra/terraform/bootstrap
#   terraform init
#   terraform apply
#   -> anotá los outputs y pegalos en ../backend.tf
# ─────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  description = "Región de AWS para el bucket de estado."
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Nombre GLOBALMENTE único del bucket de estado. Cambialo por uno tuyo."
  type        = string
  default     = "tfstate-tesis-bi-CAMBIA-ESTO"
}

# ─── Bucket S3 para el estado ─────────────────────────────────
resource "aws_s3_bucket" "tfstate" {
  bucket = var.state_bucket_name

  tags = {
    Project   = "tesis-bi"
    Purpose   = "terraform-remote-state"
    ManagedBy = "terraform"
  }
}

# Versionado: permite recuperar estados anteriores si algo sale mal
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado en reposo
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquear todo acceso público al bucket de estado
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# El bloqueo de estado usa el lock file nativo de S3 (use_lockfile),
# disponible desde Terraform 1.10 — ya no hace falta DynamoDB.

# ─── Output: copiá este valor en ../backend.tf ────────────────
output "state_bucket" {
  description = "Nombre del bucket S3 (pegalo en backend.tf → bucket)."
  value       = aws_s3_bucket.tfstate.id
}
