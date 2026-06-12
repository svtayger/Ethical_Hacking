#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

usage() {
    echo "Usage: $0 <SERVER_IP>"
    echo ""
    echo "Updates the server IP in .env and rebuilds Docker containers."
    echo "SSL certificates are auto-generated inside the nginx container."
    echo ""
    echo "Example: $0 192.168.1.100"
    echo ""
    echo "Without arguments, reads the current IP from .env."
    exit 1
}

IP="$1"

if [ -z "$IP" ]; then
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        IP="$SERVER_IP"
    fi
fi

if [ -z "$IP" ]; then
    usage
fi

if ! echo "$IP" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "Error: '$IP' is not a valid IP address."
    exit 1
fi

echo "=== Updating server IP to: $IP ==="

cat > "$ENV_FILE" <<EOF
SERVER_IP=$IP
BACKEND_PORT=8000
EOF

# Also update the nginx SSL cert to match the IP
CERT_DIR="$SCRIPT_DIR/nginx/ssl"
mkdir -p "$CERT_DIR"

if command -v openssl &>/dev/null; then
    echo "Generating SSL certificate for IP: $IP ..."
    openssl req -x509 -newkey rsa:2048 \
        -keyout "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -days 365 -nodes \
        -subj "/CN=$IP" \
        -addext "subjectAltName=IP:$IP" 2>/dev/null
    chmod 644 "$CERT_DIR"/*.pem
fi

echo "=== Rebuilding and restarting Docker containers ==="
docker compose down 2>/dev/null || true
docker compose up --build -d

echo ""
echo "=== Done! ==="
echo "Access the app at: https://$IP:8443"
echo ""
echo "Accept the self-signed certificate warning in your browser."
