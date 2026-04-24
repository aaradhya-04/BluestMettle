import sys
sys.path.append('..') # allow import from ai_module when run locally or in docker

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
import joblib
import pandas as pd
import asyncio
import uuid
import json

app = FastAPI(title="EdgeAI Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory datasets for simulation
nodes_db: Dict[str, dict] = {}
tasks_queue: List[dict] = []
completed_tasks: List[dict] = []
websocket_connections: List[WebSocket] = []

MODEL_PATH = '/ai_module/model.joblib'
if not os.path.exists(MODEL_PATH):
    # fallback for local testing if path is wrong
    MODEL_PATH = '../ai_module/model.joblib'

model = None
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("AI Decision model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print("Model not found! Tasks will fallback to default logic (Cloud).")

class NodeTelemetry(BaseModel):
    node_id: str
    cpu_usage: float
    ram_usage: float
    latency_ms: float
    status: str

class TaskSubmit(BaseModel):
    task_size_mb: float
    task_complexity: float
    
@app.on_event("startup")
async def startup_event():
    load_model()
    # background task to periodically broadcast state to clients
    asyncio.create_task(broadcast_state())

async def broadcast_state():
    while True:
        state = {
            "nodes": nodes_db,
            "tasks_queue_length": len(tasks_queue),
            "completed_tasks_length": len(completed_tasks),
            "recent_tasks": completed_tasks[-10:] if len(completed_tasks) > 0 else []
        }
        for ws in websocket_connections:
            try:
                await ws.send_json(state)
            except WebSocketDisconnect:
                websocket_connections.remove(ws)
            except Exception:
                pass
        await asyncio.sleep(1)

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    try:
        while True:
            # Just keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)

@app.post("/api/telemetry")
async def receive_telemetry(data: NodeTelemetry):
    nodes_db[data.node_id] = data.dict()
    nodes_db[data.node_id]["last_seen"] = "just now"
    return {"status": "updated"}

@app.post("/api/task")
async def submit_task(task: TaskSubmit):
    # Select the best node or cloud
    task_id = str(uuid.uuid4())
    
    selected_node = None
    placement = "Cloud"
    reasoning = "Default Fallback"
    
    if model is not None and len(nodes_db) > 0:
        # We need to make a prediction for each node
        # We will pick the node that model says it can run
        
        predictions = []
        for node_id, metrics in nodes_db.items():
            if metrics["status"] != "active": continue
            
            df = pd.DataFrame([{
                'latency_ms': metrics['latency_ms'],
                'edge_cpu_usage': metrics['cpu_usage'],
                'edge_ram_usage': metrics['ram_usage'],
                'task_complexity': task.task_complexity,
                'task_size_mb': task.task_size_mb
            }])
            
            pred = model.predict(df)[0]
            # pred: 0 = Cloud, 1 = Edge
            if pred == 1:
                predictions.append(node_id)
                
        if predictions:
            # Randomly pick an eligible edge node
            import random
            selected_node = random.choice(predictions)
            placement = "Edge"
            reasoning = f"AI routed to Node {selected_node} due to low latency + available resources"
        else:
            placement = "Cloud"
            reasoning = "AI routed to Cloud (All edge nodes overloaded or task too complex)"
    else:
        placement = "Cloud"
        reasoning = "Model missing or no edge nodes available"
        
    task_record = {
        "task_id": task_id,
        "placement": placement,
        "selected_node": selected_node,
        "reasoning": reasoning,
        "task_size_mb": task.task_size_mb,
        "task_complexity": task.task_complexity,
        "status": "completed" # simulated immediate completion
    }
    completed_tasks.append(task_record)
    
    return {"message": "Task processed", "task": task_record}

@app.get("/api/nodes")
async def get_nodes():
    return nodes_db
