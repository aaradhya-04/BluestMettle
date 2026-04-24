import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    # Features:
    # 1. latency_ms: network latency to cloud (0-1000 ms)
    # 2. edge_cpu_usage: current CPU usage of edge node (0-100 %)
    # 3. edge_ram_usage: current RAM usage of edge node (0-100 %)
    # 4. task_complexity: arbitrary units (1-100)
    # 5. task_size_mb: size of the data payload (0.1 - 50 MB)
    
    latency_ms = np.random.uniform(5, 500, num_samples)
    edge_cpu_usage = np.random.uniform(10, 99, num_samples)
    edge_ram_usage = np.random.uniform(10, 99, num_samples)
    task_complexity = np.random.uniform(1, 100, num_samples)
    task_size_mb = np.random.uniform(0.1, 50, num_samples)
    
    # Decisions logic (mock true labels):
    # If edge is overloaded (CPU > 85 or RAM > 85) or task is huge -> Cloud (0)
    # If latency is very high (> 200ms) and edge is OK -> Edge (1)
    # If task is simple & small and edge is OK -> Edge (1)
    # Default -> Cloud (0)
    
    decisions = []
    for i in range(num_samples):
        if edge_cpu_usage[i] > 85 or edge_ram_usage[i] > 85 or task_size_mb[i] > 20 or task_complexity[i] > 80:
            decisions.append(0) # Cloud
        elif latency_ms[i] > 200:
            decisions.append(1) # Edge
        elif task_complexity[i] < 30 and task_size_mb[i] < 5:
            decisions.append(1) # Edge
        else:
            # Hybrid/Random flip for middle ground
            decisions.append(np.random.choice([0, 1]))
            
    df = pd.DataFrame({
        'latency_ms': latency_ms,
        'edge_cpu_usage': edge_cpu_usage,
        'edge_ram_usage': edge_ram_usage,
        'task_complexity': task_complexity,
        'task_size_mb': task_size_mb,
        'decision': decisions
    })
    
    return df

def train():
    print("Generating synthetic data...")
    df = generate_synthetic_data(10000)
    
    X = df.drop('decision', axis=1)
    y = df['decision']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier model...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, preds, target_names=["Cloud (0)", "Edge (1)"]))
    
    # Save the model
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == '__main__':
    train()
