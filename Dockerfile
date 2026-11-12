FROM ghcr.io/ggml-org/llama.cpp:server@sha256:2103d1f4f2e2e223ad80587dcb39fc15a9f912f29ae1fa9fc1193fe8c1aea82f
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/matick
WORKDIR /srv/matick
COPY huggingface/ .
RUN /opt/matick/bin/pip install --no-cache-dir -r requirements.txt
ENV HOME=/tmp HF_HOME=/tmp/matick-modelos PORT=7860 LD_LIBRARY_PATH=/app
USER 1000
EXPOSE 7860
HEALTHCHECK NONE
ENTRYPOINT ["/opt/matick/bin/python", "/srv/matick/app.py"]

