from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agent.llm_agent import llm_agent
from core.escalation_engine import escalation_engine
from core.sensor_simulator import simulator
from core.weather_client import weather_client
from ml.prediction_model import prediction_model
from ml.watchdog import watchdog

router = APIRouter()


class ApproveRequest(BaseModel):
    approved_by: str = "owner"


class DenyRequest(BaseModel):
    denied_by: str = "owner"
    reason: str = "No reason given"


@router.get("/")
def get_pending_approvals():
    return escalation_engine.get_pending_approvals()


@router.get("/history")
def get_approval_history():
    return escalation_engine.get_audit_log(limit=50)


@router.get("/history/{pond_id}")
def get_history_by_pond(pond_id: str):
    import json
    AUDIT_FILE = "data/audit_log.json"
    try:
        with open(AUDIT_FILE, "r") as f:
            logs = json.load(f)
        filtered = [e for e in logs if e.get("pond_id") == pond_id]
        return list(reversed(filtered[-50:]))
    except Exception:
        return []


@router.post("/trigger-check")
def trigger_escalation_check():
    sensor_data = simulator.get_current_data()
    weather_features = weather_client.get_pond_impact_features()
    weather_data = weather_client.get_weather()

    predictions = prediction_model.predict_all_ponds(sensor_data, weather_features)
    watchdog_results = watchdog.validate_all_ponds(sensor_data, weather_data)

    events = escalation_engine.check_and_escalate(
        predictions, watchdog_results, llm_agent
    )
    return events


@router.post("/approve/{event_id}")
def approve_event(event_id: str, body: ApproveRequest = ApproveRequest()):
    try:
        return escalation_engine.approve_event(event_id, body.approved_by)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/deny/{event_id}")
def deny_event(event_id: str, body: DenyRequest = DenyRequest()):
    try:
        return escalation_engine.deny_event(
            event_id, body.denied_by, body.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
