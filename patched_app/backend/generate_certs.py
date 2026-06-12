"""Generate self-signed SSL certificates using the cryptography package."""
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import ipaddress
import os
import sys

SERVER_IP = os.getenv("SERVER_IP", "127.0.0.1")
CERT_DIR = os.getenv("SSL_CERT_DIR", "/app/ssl")
CERT_FILE = os.path.join(CERT_DIR, "cert.pem")
KEY_FILE = os.path.join(CERT_DIR, "key.pem")

os.makedirs(CERT_DIR, exist_ok=True)

if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
    print("SSL certificates already exist, skipping generation.")
    sys.exit(0)

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, SERVER_IP),
])

cert = (
    x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.utcnow())
    .not_valid_after(datetime.utcnow() + timedelta(days=365))
    .add_extension(
        x509.SubjectAlternativeName([x509.IPAddress(ipaddress.IPv4Address(SERVER_IP))]),
        critical=False,
    )
    .sign(key, hashes.SHA256(), default_backend())
)

with open(KEY_FILE, "wb") as f:
    f.write(key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    ))

with open(CERT_FILE, "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

os.chmod(KEY_FILE, 0o644)
os.chmod(CERT_FILE, 0o644)

print(f"Self-signed SSL certificates generated for IP: {SERVER_IP}")
print(f"  Cert: {CERT_FILE}")
print(f"  Key:  {KEY_FILE}")
