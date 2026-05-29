# AquaSense

AquaSense is an autonomous aquaculture (fish farm) monitoring and management system. It leverages live IoT sensor data, machine learning for anomaly detection and risk prediction, and a local Mistral LLM agent for intelligent decision-making.

The project features a real-time React dashboard with WebSockets to monitor and automate fish pond chemical dosing.

## Tech Stack

*   **Backend:** Python, FastAPI, Uvicorn, APScheduler
*   **Machine Learning:** scikit-learn (Isolation Forest), XGBoost, Pandas, Numpy
*   **AI Agent:** Local Ollama running `mistral` model
*   **Frontend:** React, Vite, Tailwind CSS, Recharts
*   **Real-time Data:** WebSockets

## Features

1.  **Live Sensor Simulation:** Real-time data generation for pH, Dissolved Oxygen, Turbidity, Ammonia, and Temperature across multiple ponds.
2.  **Machine Learning Pipeline:** 
    *   **Isolation Forest:** Validates sensor data integrity and detects faulty sensors.
    *   **XGBoost:** Predicts risk levels and assigns urgency scores based on current state and historical trends.
3.  **LLM Agent:** Uses a local Mistral model to analyze pond status, explain anomalies, and recommend precise chemical doses.
4.  **Escalation Engine:** Automatically escalates or executes critical actions if human approval timeouts expire.
5.  **Interactive React Dashboard:** A dark-mode-first dashboard with live WebSockets, data visualizations, alert management, and farm summary reports.

## Setup & Running

The easiest way to start all services locally is to use the provided one-command startup scripts.

**On Windows:**
```bash
.\start.bat
```

**On Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

These scripts will automatically launch:
1.  **Ollama (Mistral):** at `http://localhost:11434`
2.  **FastAPI Backend:** at `http://localhost:8001` (Docs: `http://localhost:8001/docs`)
3.  **React Frontend:** at `http://localhost:5173`

*(Note: Ensure you have Python 3.12, Node.js 24+, and Ollama installed before running the scripts.)*

## Environment Configuration

A `.env` file should be present in the root directory. You can optionally set `OPENWEATHER_API_KEY` for live weather. Simulated weather is used when the key is missing.
