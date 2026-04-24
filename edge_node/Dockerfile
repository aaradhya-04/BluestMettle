FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY simulate_node.py .

CMD ["python", "-u", "simulate_node.py"]
