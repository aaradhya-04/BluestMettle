# EdgeAI Orchestrator

An Intelligent Edge Computing Orchestrator platform that dynamically distributes computational workloads between edge devices and cloud infrastructure using AI-driven (Scikit-Learn) decision-making.

## 🚀 Features
- **AI Decision Engine:** Scikit-learn Random Forest model predicting workload placement based on latency, CPU/RAM usage, and task complexity.
- **Dynamic Orchestration:** FastAPI backend continuously ingests telemetry and assigns tasks.
- **Real-time Monitoring:** React.js dashboard showing edge topology, live telemetrics, and AI reasoning.
- **Edge Simulation:** Python-based edge node containers simulating dynamic hardware conditions.

## 🛠️ Tech Stack
- **Backend:** Python, FastAPI, Motor/MongoDB (optional), Websockets
- **Frontend:** React.js, Vite, Recharts, Lucide React
- **AI/ML:** Scikit-Learn, Pandas, Numpy, Joblib
- **Orchestration:** Docker, Docker Compose

## 📦 Running the Application

Since this project requires Python for the AI module and backend, it's fully dockerized to ensure it works anywhere without local environment setup.

### Prerequisites
- Docker
- Docker Compose

### Startup
1. Open your terminal in the root directory of this project (`BluestMettle`).
2. Train the model (optional, the backend will fallback to cloud-only if model is not generated, but for the full AI experience, you should generate it):
   *Note: I recommend letting the backend run if you don't have Python installed locally. We've set up the backend to handle the model loading.*

   Wait, the easiest way to run the full stack is:
   ```bash
   docker-compose build
   ```
   **To Train the AI Model before running (Using Docker):**
   ```bash
   docker run --rm -v ${PWD}/ai_module:/app -w /app python:3.10-slim bash -c "pip install scikit-learn pandas joblib numpy && python train_model.py"
   ```
   *(This trains the model and saves `model.joblib` to your disk).*

3. Start the entire orchestrator:
   ```bash
   docker-compose up
   ```

### Accessing the System
- **Dashboard:** Open your browser to `http://localhost:5173`
- **Backend APIs:** Open your browser to `http://localhost:8000/docs`

## 🧠 How it Works
1. Three edge nodes (`Edge-Alpha-US`, `Edge-Beta-EU`, `Edge-Gamma-AP`) boot up and start broadcasting telemetry (CPU, RAM, Latency) every few seconds to the backend.
2. Visit the dashboard to view the **Edge Network Topology**.
3. Submit a manual workload via the **Task Simulator Panel**.
4. The backend gathers the task spec, checks all active nodes, and uses the `model.joblib` Random Forest classifier to determine if an edge node can handle it (returning `Edge`) or if it's too complex / nodes are overloaded (returning `Cloud`).
5. The decision and exact reasoning are pushed to the UI via WebSockets immediately.
