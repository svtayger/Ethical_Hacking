#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IP="$1"

if [ -z "$IP" ]; then
    echo "Usage: $0 <SERVER_IP>"
    exit 1
fi

CERT_FILE="$SCRIPT_DIR/cert.pem"
KEY_FILE="$SCRIPT_DIR/key.pem"

# Try openssl first, fall back to Docker-based generation
if command -v openssl &>/dev/null; then
    echo "Generating SSL certificates with openssl for IP: $IP ..."
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 -nodes \
        -subj "/CN=$IP" \
        -addext "subjectAltName=IP:$IP"
    chmod 644 "$KEY_FILE" "$CERT_FILE"
    echo "Done."
else
    echo "openssl not found on host. Certs will be generated inside Docker on startup."
    echo "Run the app with: docker compose up --build -d"
    echo "Certs will auto-generate in the backend container via generate_certs.py"
fi
