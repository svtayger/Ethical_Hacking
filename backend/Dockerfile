# Use an official Python runtime as a parent image
FROM python:3.10-slim

# VULNERABILITY: Running as root (default in this Dockerfile)
# No USER command is used to drop privileges.

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
# VULNERABILITY: Debug mode will be active via app settings in main.py
CMD ["python", "main.py"]
