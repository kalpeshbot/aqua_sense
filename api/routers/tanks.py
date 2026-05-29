import json
import os

from fastapi import APIRouter, HTTPException

router = APIRouter()

TANKS_FILE = "data/tanks.json"


def _load_tanks():
    with open(TANKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
def get_all_tanks():
    return _load_tanks()


@router.get("/status/low")
def get_low_tanks():
    data = _load_tanks()
    low_tanks = {}

    for tank_id, tank in data.get("tanks", {}).items():
        threshold = tank.get("low_threshold_percent", 20)
        is_low = False

        if "capacity_L" in tank:
            percent = (tank["current_L"] / tank["capacity_L"]) * 100
            is_low = percent < threshold
        elif "capacity_mins" in tank:
            percent = (tank["current_mins"] / tank["capacity_mins"]) * 100
            is_low = percent < threshold
        elif "capacity_kg" in tank:
            percent = (tank["current_kg"] / tank["capacity_kg"]) * 100
            is_low = percent < threshold

        if is_low:
            low_tanks[tank_id] = tank

    return low_tanks


@router.get("/{tank_id}")
def get_tank(tank_id: str):
    data = _load_tanks()
    tanks = data.get("tanks", {})
    if tank_id not in tanks:
        raise HTTPException(status_code=404, detail="Tank not found")
    return tanks[tank_id]
