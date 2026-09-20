#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Bootstrap de la instancia — Amazon Linux 2023 (ARM64 / Graviton)
# Instala Docker + Docker Compose y prepara la carpeta de la app.
# ─────────────────────────────────────────────────────────────
set -euxo pipefail

# Actualizar paquetes
dnf update -y

# Docker
dnf install -y docker git
systemctl enable --now docker

# Permitir usar docker sin sudo al usuario ec2-user
usermod -aG docker ec2-user

# Docker Compose v2 (plugin) para ARM64
DOCKER_CONFIG=/usr/local/lib/docker
mkdir -p "$DOCKER_CONFIG/cli-plugins"
COMPOSE_VERSION="v2.29.7"
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

# ─────────────────────────────────────────────────────────────
# Swap de 2 GB — compensa la RAM limitada de t4g.small (2 GB).
# Evita que el servicio ML (Python + modelo) muera por OOM.
# ─────────────────────────────────────────────────────────────
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Menos agresivo al usar swap (prioriza RAM real)
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# Carpeta donde vas a clonar/copiar el proyecto
mkdir -p /opt/tesis-bi
chown ec2-user:ec2-user /opt/tesis-bi

# Marca de que el bootstrap terminó
echo "bootstrap completado el $(date -u)" > /opt/tesis-bi/BOOTSTRAP_OK.txt
