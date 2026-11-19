#!/usr/bin/env bash
# Se ejecuta UNA vez en la EC2. Lee la contrasena maestra de RDS desde Secrets Manager
# (rol IAM de la instancia), crea la base y un usuario exclusivo para la API con una
# contrasena aleatoria, y genera /opt/api-libros/.env (permisos 600). Nada se imprime.
# Uso: bootstrap-db.sh <RDS_ENDPOINT> <SECRET_ARN>
set -euo pipefail
ENDPOINT="$1"; SECRET_ARN="$2"
REGION=$(echo "$SECRET_ARN" | cut -d: -f4)
ENV_FILE=/opt/api-libros/.env

SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$SECRET_ARN" --query SecretString --output text)
export MYSQL_PWD; MYSQL_PWD=$(echo "$SECRET" | jq -r .password)
MASTER_USER=$(echo "$SECRET" | jq -r .username)
APP_PW=$(openssl rand -hex 20)

mysql -h "$ENDPOINT" -u "$MASTER_USER" <<SQL
CREATE DATABASE IF NOT EXISTS db_libros CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'usr_libros'@'%' IDENTIFIED BY '${APP_PW}';
ALTER USER 'usr_libros'@'%' IDENTIFIED BY '${APP_PW}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON db_libros.* TO 'usr_libros'@'%';
FLUSH PRIVILEGES;
SQL
unset MYSQL_PWD

umask 077
cat > "$ENV_FILE" <<ENV
PORT=3000
NODE_ENV=production
DB_HOST=${ENDPOINT}
DB_PORT=3306
DB_USER=usr_libros
DB_PASSWORD=${APP_PW}
DB_NAME=db_libros
ENV
echo "Usuario usr_libros creado y $ENV_FILE generado (permisos 600)."
