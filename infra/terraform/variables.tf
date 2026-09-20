# ─────────────────────────────────────────────────────────────
# Variables de entrada
# ─────────────────────────────────────────────────────────────

variable "region" {
  description = "Región de AWS."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Perfil de AWS CLI a usar (opcional). Vacío = credenciales por defecto/env."
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Nombre del proyecto, usado como prefijo de recursos."
  type        = string
  default     = "tesis-bi"
}

variable "environment" {
  description = "Entorno lógico (dev, staging, prod)."
  type        = string
  default     = "prod"
}

# ─── EC2 Graviton (ARM64) ─────────────────────────────────────
variable "instance_type" {
  description = <<-EOT
    Tipo de instancia ARM/Graviton. Opciones económicas:
      t4g.small   (2 vCPU, 2 GB)  — mínimo para el stack completo, algo justo
      t4g.medium  (2 vCPU, 4 GB)  — recomendado para Postgres + backend + ML + frontend
      t4g.large   (2 vCPU, 8 GB)  — holgado si el modelo ML consume RAM
    t4g son elegibles para capa gratuita (750 h/mes de t4g.small durante el primer año
    con el free tier estándar, sujeto a condiciones de tu cuenta).
  EOT
  type        = string
  default     = "t4g.medium"
}

variable "root_volume_size" {
  description = "Tamaño del disco raíz en GB."
  type        = number
  default     = 30
}

variable "key_pair_name" {
  description = <<-EOT
    Nombre del EC2 Key Pair para SSH.
    - Si create_key_pair = true, Terraform lo crea con este nombre y guarda el .pem local.
    - Si create_key_pair = false, debe ser un key pair que YA EXISTE en la región.
    - Vacío = sin llave (entrás por SSM Session Manager).
  EOT
  type        = string
  default     = ""
}

variable "create_key_pair" {
  description = <<-EOT
    true  = Terraform genera el par de llaves y guarda el .pem en esta carpeta.
    false = usa un key pair existente (o SSM si key_pair_name está vacío).
  EOT
  type        = bool
  default     = false
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    CIDR autorizado para SSH (puerto 22). Por seguridad, poné TU IP: "x.x.x.x/32".
    Averiguá tu IP con: curl ifconfig.me
    Default 0.0.0.0/0 = abierto a todo internet (NO recomendado, cambialo).
  EOT
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_ports" {
  description = "Puertos de la aplicación a exponer públicamente (del docker-compose)."
  type        = list(number)
  # 80/443 web, 4000 backend, 5173 frontend, 8000 ML, 8025 Mailhog UI
  default     = [80, 443, 4000, 5173, 8000, 8025]
}

variable "associate_eip" {
  description = "Asociar una IP elástica fija (recomendado para que la IP no cambie al reiniciar)."
  type        = bool
  default     = true
}
