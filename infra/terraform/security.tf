# ─────────────────────────────────────────────────────────────
# Security Group: firewall de la instancia
# ─────────────────────────────────────────────────────────────

resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "Acceso a la app y SSH para ${var.project_name}"
  vpc_id      = data.aws_vpc.default.id

  # SSH — restringido al CIDR indicado (poné tu IP en ssh_allowed_cidr)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # Puertos de la aplicación (definidos en var.app_ports)
  dynamic "ingress" {
    for_each = toset(var.app_ports)
    content {
      description = "App port ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  # Salida: todo permitido (para que el server baje imágenes, envíe SES, etc.)
  egress {
    description = "Salida a internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}
