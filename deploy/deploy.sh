#!/usr/bin/env bash
# Despliegue con verificacion de salud (se ejecuta en la EC2 desde GitHub Actions).
# Uso: deploy.sh <imagen:tag>
# 1) levanta la nueva version en 127.0.0.1:3001, 2) valida /health (incluye RDS),
# 3) solo si esta sana reemplaza al contenedor activo en 127.0.0.1:3000.
set -euo pipefail

IMAGE="$1"
NAME=api-libros
ENV_FILE=/opt/api-libros/.env

if [ ! -f "$ENV_FILE" ]; then
  echo "Falta $ENV_FILE con las credenciales de RDS" >&2
  exit 1
fi

docker pull "$IMAGE"
docker rm -f "$NAME-new" >/dev/null 2>&1 || true
docker run -d --name "$NAME-new" --env-file "$ENV_FILE" -p 127.0.0.1:3001:3000 "$IMAGE"

echo "Esperando health check de la nueva version..."
ok=0
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3001/health; then ok=1; break; fi
  sleep 3
done
echo

if [ "$ok" != 1 ]; then
  echo "Health check FALLIDO: se mantiene la version anterior." >&2
  docker logs --tail 30 "$NAME-new" || true
  docker rm -f "$NAME-new" || true
  exit 1
fi

echo "Health check OK. Activando nueva version..."
docker rm -f "$NAME-new"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --env-file "$ENV_FILE" \
  -p 127.0.0.1:3000:3000 "$IMAGE"

for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1/health; then echo; echo "Despliegue completado: $IMAGE"; break; fi
  sleep 2
done
docker image prune -f >/dev/null
docker ps --filter "name=$NAME"
