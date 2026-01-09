FROM openfoam/openfoam11-paraview510

# Switch to root user for installations
USER root

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .

# Create OpenFOAM case directory
RUN mkdir -p /app/cases

# Expose port
EXPOSE 8000

# Source OpenFOAM environment and start server
CMD ["/bin/bash", "-c", "source /opt/openfoam11/etc/bashrc && python3 server.py"]