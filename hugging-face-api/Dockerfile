# Alternative Dockerfile if openfoam base image continues to cause issues
# This installs OpenFOAM from scratch on Debian

FROM debian:bookworm-slim

USER root

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Add OpenFOAM repository
RUN wget -q -O - https://dl.openfoam.com/add-debian-repo.sh | bash

# Install OpenFOAM
RUN apt-get update && apt-get install -y \
    openfoam2312-default \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY server.py .

# Create OpenFOAM case directory
RUN mkdir -p /app/cases

# Expose port
EXPOSE 7860

# Source OpenFOAM environment and start server
CMD ["/bin/bash", "-c", "source /usr/lib/openfoam/openfoam2312/etc/bashrc && python3 server.py"]