#!/usr/bin/env bash
# Obtiene un certificado de Let's Encrypt para <IP-con-guiones>.sslip.io y activa HTTPS en Nginx.
# Uso (en la EC2): sudo ./enable-https.sh 3-219-43-118.sslip.io
set -euo pipefail
DOMAIN="$1"
apt-get install -y -qq certbot
certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --agree-tos --register-unsafely-without-email --non-interactive
cat > /etc/letsencrypt/options-ssl-nginx.conf <<CONF
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305";
CONF
test -f /etc/letsencrypt/ssl-dhparams.pem || openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
curl -fsSL https://raw.githubusercontent.com/walterjaldin/api-libros-ec2-rds/main/deploy/nginx-api-libros.conf \
  | sed "s/3-219-43-118.sslip.io/$DOMAIN/g" > /etc/nginx/sites-available/api-libros
nginx -t && systemctl reload nginx
grep -q renew_hook "/etc/letsencrypt/renewal/$DOMAIN.conf" || echo "renew_hook = systemctl reload nginx" >> "/etc/letsencrypt/renewal/$DOMAIN.conf"
echo "HTTPS activo en https://$DOMAIN (renovación automática con certbot.timer)"
