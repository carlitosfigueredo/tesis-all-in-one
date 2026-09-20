# ─────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────

output "instance_id" {
  description = "ID de la instancia EC2."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "IP pública para acceder a la app (EIP si está habilitada)."
  value       = var.associate_eip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip
}

output "public_dns" {
  description = "DNS público de la instancia."
  value       = aws_instance.app.public_dns
}

output "ssh_command" {
  description = "Comando SSH sugerido (si configuraste un key pair)."
  value = local.effective_key_name != null ? format(
    "ssh -i %s.pem ec2-user@%s",
    var.key_pair_name,
    var.associate_eip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip
  ) : "Sin key pair: usá 'aws ssm start-session --target ${aws_instance.app.id}'"
}

output "ssh_key_secret_name" {
  description = "Nombre del secreto en Secrets Manager con la llave privada (si TF la creó)."
  value       = var.create_key_pair ? aws_secretsmanager_secret.ssh_key[0].name : null
}

output "get_key_command" {
  description = "Comando para descargar el .pem desde Secrets Manager."
  value = var.create_key_pair ? format(
    "aws secretsmanager get-secret-value --region %s --secret-id %s --query SecretString --output text > %s.pem; icacls %s.pem /inheritance:r /grant:r \"%%USERNAME%%:R\"",
    var.region,
    aws_secretsmanager_secret.ssh_key[0].name,
    var.key_pair_name,
    var.key_pair_name
  ) : "No aplica (create_key_pair = false)"
}
