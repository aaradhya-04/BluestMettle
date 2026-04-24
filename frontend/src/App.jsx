import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar,
  AreaChart, Area
} from 'recharts';
import { Server, Activity, HardDrive, Cpu, CloudLightning, ActivitySquare } from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/dashboard';

function App() {
  const [state, setState] = useState({
    nodes: {},
    tasks_queue_length: 0,
    completed_tasks_length: 0,
    recent_tasks: []
  });
  const [wsStatus, setWsStatus] = useState('connecting');
  const [taskSize, setTaskSize] = useState(10);
  const [taskComplexity, setTaskComplexity] = useState(50);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => setWsStatus('connected');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setState(data);
        
        // Update chart data history
        setChartData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tasks: data.completed_tasks_length
          }];
          return newData.slice(-20); // Keep last 20 points
        });
      };
      
      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connect, 3000); // Reconnect
      };
    };

    connect();
    return () => ws?.close();
  }, []);

  const submitTask = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_size_mb: parseFloat(taskSize),
          task_complexity: parseFloat(taskComplexity)
        })
      });
    } catch (err) {
      console.error("Failed to submit task:", err);
    }
  };

  // derived metrics
  const activeNodesCount = Object.values(state.nodes).filter(n => n.status === 'active').length;
  const nodesList = Object.values(state.nodes);
  
  // Placement stats
  const cloudCount = state.recent_tasks.filter(t => t.placement === 'Cloud').length;
  const edgeCount = state.recent_tasks.filter(t => t.placement === 'Edge').length;

  return (
    <div className="dashboard-container">
      <header>
        <h1><CloudLightning size={32} style={{verticalAlign: 'middle', marginRight: '10px'}}/> EdgeAI Orchestrator</h1>
        <div className="status-badge">
          <div className={`status-dot ${wsStatus === 'connected' ? '' : 'disconnected'}`}></div>
          {wsStatus === 'connected' ? 'Live Telemetry Active' : 'Connecting to Orchestrator...'}
        </div>
      </header>

      <div className="grid-layout">
        
        {/* KPI Area */}
        <div className="col-span-12 stats-grid">
          <div className="stat-card">
            <span className="stat-label">Active Edge Nodes</span>
            <div className="stat-value" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Server size={24} color="var(--primary)"/> {activeNodesCount} / {nodesList.length}
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Processed Workloads</span>
            <div className="stat-value" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <ActivitySquare size={24} color="var(--secondary)"/> {state.completed_tasks_length}
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tasks Pending Queue</span>
            <div className="stat-value">{state.tasks_queue_length}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Last 10 Placements</span>
            <div className="stat-value" style={{fontSize: '1.25rem', paddingTop: '5px'}}>
              <span style={{color: 'var(--secondary)'}}>E:{edgeCount}</span> / <span style={{color: 'var(--primary)'}}>C:{cloudCount}</span>
            </div>
          </div>
        </div>

        {/* Node Topology */}
        <div className="glass-panel col-span-8">
          <h2><Activity size={24}/> Edge Network Topology</h2>
          <div className="node-list">
            {nodesList.length === 0 ? (
              <div style={{color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center'}}>No edge nodes registered yet. Waiting for telemetry...</div>
            ) : nodesList.map(node => (
              <div key={node.node_id} className="node-item">
                <div className="node-info">
                  <span className="node-name">{node.node_id}</span>
                  <span className={`node-status ${node.status === 'overloaded' ? 'overloaded' : ''}`}>Status: {node.status.toUpperCase()}</span>
                </div>
                <div className="node-metrics">
                  <div className="metric">
                    <span className="metric-label">CPU</span>
                    <span className="metric-value">{node.cpu_usage}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">RAM</span>
                    <span className="metric-value">{node.ram_usage}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Latency</span>
                    <span className="metric-value">{node.latency_ms}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{height: '250px', marginTop: '2rem'}}>
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12}/>
                <YAxis stroke="var(--text-muted)" fontSize={12}/>
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)', borderColor: 'var(--panel-border)'}}/>
                <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Simulator Panel */}
        <div className="glass-panel col-span-4">
          <h2><HardDrive size={24}/> Task Simulator</h2>
          <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            Submit a manual workload to the orchestrator to watch the AI decision engine in action.
          </p>
          <form className="task-form" onSubmit={submitTask}>
            <div className="form-group">
              <label>Payload Size (MB): {taskSize}</label>
              <input 
                type="range" min="0.1" max="100" step="0.1" 
                value={taskSize} onChange={e => setTaskSize(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Computational Complexity (1-100): {taskComplexity}</label>
              <input 
                type="range" min="1" max="100" 
                value={taskComplexity} onChange={e => setTaskComplexity(e.target.value)} 
              />
            </div>
            <button className="btn" type="submit" style={{marginTop: '1rem'}}>
              Dispatch Workload
            </button>
          </form>
        </div>

        {/* Task History Panel */}
        <div className="glass-panel col-span-12">
          <h2><Cpu size={24}/> AI Orchestrator Logs</h2>
          <div style={{overflowX: 'auto'}}>
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Size (MB)</th>
                  <th>Complexity</th>
                  <th>Placement Target</th>
                  <th>Target Node</th>
                  <th>AI Reasoning / Logic</th>
                </tr>
              </thead>
              <tbody>
                {[...state.recent_tasks].reverse().map((task, idx) => (
                  <tr key={idx}>
                    <td>{task.task_id.substring(0, 8)}...</td>
                    <td>{task.task_size_mb.toFixed(1)}</td>
                    <td>{task.task_complexity.toFixed(1)}</td>
                    <td>
                      <span className={`badge ${task.placement.toLowerCase()}`}>
                        {task.placement}
                      </span>
                    </td>
                    <td>{task.selected_node || 'N/A'}</td>
                    <td style={{color: 'var(--text-muted)'}}>{task.reasoning}</td>
                  </tr>
                ))}
                {state.recent_tasks.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No tasks processed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
