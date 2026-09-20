# ─────────────────────────────────────────────────────────────
# IAM: rol de instancia
#   - SSM: acceso por Session Manager sin abrir SSH (opcional pero cómodo)
#   - SES: permiso para enviar correos vía la API/SMTP de SES
# ─────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Permite administrar la instancia con SSM Session Manager
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Permiso mínimo para enviar correos con SES
data "aws_iam_policy_document" "ses_send" {
  statement {
    sid     = "SESSend"
    effect  = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "ses_send" {
  name   = "${var.project_name}-ses-send"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ses_send.json
}

# Permitir a la instancia leer su propia llave SSH del Secrets Manager
# (solo si Terraform la creó).
data "aws_iam_policy_document" "read_ssh_secret" {
  count = var.create_key_pair ? 1 : 0
  statement {
    sid       = "ReadOwnSSHKey"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.ssh_key[0].arn]
  }
}

resource "aws_iam_role_policy" "read_ssh_secret" {
  count  = var.create_key_pair ? 1 : 0
  name   = "${var.project_name}-read-ssh-secret"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.read_ssh_secret[0].json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
