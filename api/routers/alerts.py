import json

from fastapi import APIRouter

router = APIRouter()

ALERTS_FILE = "data/audit_log.json"


def _load_alerts():
    with open(ALERTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
def get_all_alerts():
    return _load_alerts()


@router.get("/active")
def get_active_alerts():
    alerts = _load_alerts()
    active = [entry for entry in alerts if entry.get("resolved") is False]
    return active


@router.get("/history")
def get_alert_history():
    alerts = _load_alerts()
    return list(reversed(alerts[-50:]))
