#!/bin/bash
# User data de la EC2: prepara el servidor para ejecutar la API en Docker detras de Nginx.
# __DEPLOY_PUBKEY__ y __REPO__ se reemplazan en aws-setup.sh.
set -eux
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl nginx mysql-client jq openssl
snap install aws-cli --classic
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
usermod -aG docker ubuntu

# Llave publica del pipeline de GitHub Actions (la privada vive solo en GitHub Secrets)
echo "__DEPLOY_PUBKEY__" >> /home/ubuntu/.ssh/authorized_keys

# SSH solo con llaves (sin contrasenas)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || true

# Directorio de la aplicacion (aqui se crea .env con credenciales de RDS, fuera del repo)
mkdir -p /opt/api-libros
chown ubuntu:ubuntu /opt/api-libros
chmod 750 /opt/api-libros

# Nginx como proxy inverso 80 -> 127.0.0.1:3000
# (se omite el bloque HTTPS hasta obtener el certificado con certbot; ver INFORME.md, paso 4.8)
curl -fsSL "https://raw.githubusercontent.com/__REPO__/main/deploy/nginx-api-libros.conf" \
  | sed '/^# HTTPS con/,/^}$/d' > /etc/nginx/sites-available/api-libros
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/api-libros /etc/nginx/sites-enabled/api-libros
nginx -t && systemctl reload nginx
