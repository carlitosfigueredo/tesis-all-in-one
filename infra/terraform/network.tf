# ─────────────────────────────────────────────────────────────
# Red: usamos la VPC por defecto para simplicidad (ideal para tesis).
# Si más adelante querés una VPC dedicada, se puede modularizar.
# ─────────────────────────────────────────────────────────────

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Tomamos la primera subnet pública disponible
locals {
  subnet_id = data.aws_subnets.default.ids[0]
}
