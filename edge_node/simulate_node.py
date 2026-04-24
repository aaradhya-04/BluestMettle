import time
import random
import requests
import os
import uuid

NODE_ID = os.environ.get("NODE_ID", f"edge-{str(uuid.uuid4())[:8]}")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")

def simulate():
    print(f"Starting Edge Node Simulator: {NODE_ID}")
    
    # Base hardware capabilities
    base_latency = random.uniform(5, 50) # Very good to decent latency
    
    while True:
        try:
            # Simulate varying conditions
            cpu = random.uniform(10, 95)
            ram = random.uniform(20, 90)
            lat = base_latency + random.uniform(-5, 20)
            if lat < 1: lat = 1
            
            payload = {
                "node_id": NODE_ID,
                "cpu_usage": round(cpu, 2),
                "ram_usage": round(ram, 2),
                "latency_ms": round(lat, 2),
                "status": "active" if cpu < 90 else "overloaded"
            }
            
            requests.post(f"{BACKEND_URL}/api/telemetry", json=payload, timeout=2)
            print(f"Sent telemetry: {payload}")
            
        except Exception as e:
            print(f"Failed to send telemetry to backend ({BACKEND_URL}): {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    time.sleep(5) # wait for backend to boot up
    simulate()
