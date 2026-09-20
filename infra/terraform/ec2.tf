# ─────────────────────────────────────────────────────────────
# Instancia EC2 Graviton (ARM64)
# ─────────────────────────────────────────────────────────────

# AMI de Amazon Linux 2023 para ARM64 (Graviton), siempre la más reciente.
# Se resuelve por filtros sobre las AMIs oficiales de Amazon, sin hardcodear IDs.
data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023_arm64.id
  instance_type          = var.instance_type
  subnet_id              = local.subnet_id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # Key pair: generado por TF (Secrets Manager), existente, o null (SSM).
  key_name = local.effective_key_name

  user_data                   = file("${path.module}/user_data.sh")
  user_data_replace_on_change = true

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 obligatorio (buena práctica de seguridad)
    http_endpoint = "enabled"
  }

  tags = {
    Name = "${var.project_name}-app"
    Arch = "arm64-graviton"
  }
}

# IP elástica fija (opcional, controlada por var.associate_eip)
resource "aws_eip" "app" {
  count    = var.associate_eip ? 1 : 0
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}
