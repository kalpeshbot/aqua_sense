import json
import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

THRESHOLDS_FILE = "data/thresholds.json"


class ThresholdUpdate(BaseModel):
    value: float


@router.get("/thresholds")
def get_thresholds():
    with open(THRESHOLDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.put("/thresholds/{pond_id}/{chemical}/{tier}")
def update_threshold(pond_id: str, chemical: str, tier: str, body: ThresholdUpdate):
    if tier == "absolute_max":
        raise HTTPException(
            status_code=403,
            detail="Absolute maximum cannot be modified. This is a hard biological safety limit.",
        )

    if tier not in ("auto_limit", "owner_limit"):
        raise HTTPException(status_code=400, detail="Tier must be auto_limit or owner_limit")

    with open(THRESHOLDS_FILE, "r", encoding="utf-8") as f:
        thresholds = json.load(f)

    if pond_id not in thresholds:
        raise HTTPException(status_code=404, detail="Pond not found")

    if chemical not in thresholds[pond_id]:
        raise HTTPException(status_code=404, detail="Chemical not found")

    thresholds[pond_id][chemical][tier] = body.value

    with open(THRESHOLDS_FILE, "w", encoding="utf-8") as f:
        json.dump(thresholds, f, indent=2)

    return {
        "success": True,
        "updated": {pond_id: {chemical: {tier: body.value}}},
    }


@router.get("/env")
def get_env_info():
    return {
        "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
        "WEATHER_CITY": os.getenv("WEATHER_CITY", "Chennai"),
        "WEATHER_COUNTRY": os.getenv("WEATHER_COUNTRY", "IN"),
        "OLLAMA_MODEL": os.getenv("OLLAMA_MODEL", "mistral:latest"),
    }
