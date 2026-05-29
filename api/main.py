import asyncio
from typing import List

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agent.llm_agent import llm_agent
from api.routers import (
    agent as agent_router,
    alerts,
    approvals as approvals_router,
    ponds,
    predictions,
    sensors,
    settings,
    tanks,
    watchdog,
)
from core.escalation_engine import escalation_engine
from core.sensor_simulator import simulator
from core.weather_client import weather_client
from ml.prediction_model import prediction_model
from ml.watchdog import watchdog as watchdog_ml


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        import json
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(data))
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()

app = FastAPI(
    title="AquaSense API",
    version="1.0.0",
    description="Autonomous Aquaculture Management System",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ponds.router, prefix="/api/ponds", tags=["Ponds"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(tanks.router, prefix="/api/tanks", tags=["Tanks"])
app.include_router(sensors.router, prefix="/api/sensors", tags=["Sensors"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(watchdog.router, prefix="/api/watchdog", tags=["Watchdog"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(agent_router.router, prefix="/api/agent", tags=["Agent"])
app.include_router(approvals_router.router, prefix="/api/approvals", tags=["Approvals"])

scheduler = None


@app.get("/")
def root():
    return {
        "message": "AquaSense API is running",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/api/weather", tags=["Weather"])
def get_weather():
    return weather_client.get_weather()


@app.get("/api/weather/pond-impact", tags=["Weather"])
def get_pond_impact():
    return weather_client.get_pond_impact_features()


@app.on_event("startup")
def startup_event():
    global scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        simulator.update_all_ponds,
        "interval",
        seconds=5,
    )
    scheduler.add_job(
        lambda: escalation_engine.check_and_escalate(
            prediction_model.predict_all_ponds(
                simulator.get_current_data(),
                weather_client.get_pond_impact_features(),
            ),
            watchdog_ml.validate_all_ponds(
                simulator.get_current_data(),
                weather_client.get_weather(),
            ),
            llm_agent,
        ),
        trigger="interval",
        seconds=60,
        id="escalation_check",
    )
    scheduler.start()
    print("AquaSense sensor simulation started")


@app.on_event("shutdown")
def shutdown_event():
    global scheduler
    if scheduler:
        scheduler.shutdown()
    print("AquaSense API shutting down")


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = simulator.get_current_data()
            await manager.broadcast(data)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "backend": "AquaSense API v1.0.0",
        "simulator_running": True,
        "websocket_endpoint": "ws://localhost:8001/ws/live",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }
