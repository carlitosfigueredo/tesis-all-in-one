# ─────────────────────────────────────────────────────────────
# Key pair generado por Terraform (solo si create_key_pair = true).
# La llave privada se guarda en AWS Secrets Manager, NO en disco.
#   Recuperarla: aws secretsmanager get-secret-value \
#     --secret-id <nombre> --query SecretString --output text > tesis.pem
# ─────────────────────────────────────────────────────────────

# 1. Generar el par de llaves RSA 4096
resource "tls_private_key" "ssh" {
  count     = var.create_key_pair ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# 2. Registrar la llave pública como EC2 Key Pair
resource "aws_key_pair" "this" {
  count      = var.create_key_pair ? 1 : 0
  key_name   = var.key_pair_name
  public_key = tls_private_key.ssh[0].public_key_openssh

  tags = {
    Name = var.key_pair_name
  }
}

# 3. Guardar la llave privada en Secrets Manager
resource "aws_secretsmanager_secret" "ssh_key" {
  count                   = var.create_key_pair ? 1 : 0
  name                    = "${var.project_name}/ssh/${var.key_pair_name}"
  description             = "Llave privada SSH de la EC2 ${var.project_name}"
  recovery_window_in_days = 0 # permite recrear con el mismo nombre sin esperar

  tags = {
    Name = "${var.project_name}-ssh-key"
  }
}

resource "aws_secretsmanager_secret_version" "ssh_key" {
  count         = var.create_key_pair ? 1 : 0
  secret_id     = aws_secretsmanager_secret.ssh_key[0].id
  secret_string = tls_private_key.ssh[0].private_key_pem
}

# Nombre efectivo del key pair a usar en la instancia:
#   - el creado por TF, si create_key_pair = true
#   - el que hayas puesto en key_pair_name (existente), si es false
#   - null (sin llave, SSM) si está vacío
locals {
  effective_key_name = var.create_key_pair ? aws_key_pair.this[0].key_name : (var.key_pair_name != "" ? var.key_pair_name : null)
}
