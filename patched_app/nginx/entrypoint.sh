#!/bin/sh
set -e

CERT_DIR="/etc/nginx/ssl"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    mkdir -p "$CERT_DIR"
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 -nodes \
        -subj "/CN=localhost" \
        -addext "subjectAltName=IP:127.0.0.1"
    chmod 644 "$KEY_FILE" "$CERT_FILE"
    echo "Certificate generated."
fi

exec nginx -g "daemon off;"
