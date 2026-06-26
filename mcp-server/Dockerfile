FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY digibrain_mcp ./digibrain_mcp
RUN pip install --no-cache-dir .

# Run as the internet-facing Streamable HTTP server.
ENV MCP_TRANSPORT=http \
    MCP_HOST=0.0.0.0 \
    MCP_PORT=8002

EXPOSE 8002

CMD ["python", "-m", "digibrain_mcp"]
