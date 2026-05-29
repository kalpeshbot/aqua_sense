from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agent.llm_agent import llm_agent
from core.escalation_engine import escalation_engine
from core.sensor_simulator import simulator
from core.weather_client import weather_client
from ml.feature_engineering import feature_engineer
from ml.prediction_model import prediction_model
from ml.watchdog import watchdog

router = APIRouter()

VALID_PONDS = ["pond_1", "pond_2", "pond_3"]


class AskRequest(BaseModel):
    question: str
    pond_id: str = "pond_1"


def _get_pond_prediction_and_watchdog(pond_id: str):
    sensor_data = simulator.get_current_data()
    if pond_id not in sensor_data.get("ponds", {}):
        raise HTTPException(status_code=404, detail="Pond not found")

    weather_features = weather_client.get_pond_impact_features()
    weather_data = weather_client.get_weather()

    pond = sensor_data["ponds"][pond_id]
    sensor_readings = {name: info["value"] for name, info in pond["sensors"].items()}
    watchdog_result = watchdog.validate_pond(pond_id, sensor_readings, weather_data)

    sensor_dict = {}
    for name, info in watchdog_result["sensors"].items():
        if info["status"] == "FAULTY" and info["estimated_value"] is not None:
            sensor_dict[name] = info["estimated_value"]
        else:
            sensor_dict[name] = info["value"]

    previous = prediction_model.reading_history.get(pond_id, [])
    fv = feature_engineer.build_feature_vector(
        pond_id, sensor_dict, weather_features, previous_readings=previous or None
    )
    prediction_result = prediction_model.predict_pond(pond_id, fv, sensor_dict)

    return prediction_result, watchdog_result


@router.get("/summary")
def get_farm_summary():
    sensor_data = simulator.get_current_data()
    weather_features = weather_client.get_pond_impact_features()
    weather = weather_client.get_weather()
    all_predictions = prediction_model.predict_all_ponds(sensor_data, weather_features)
    return llm_agent.get_farm_summary(sensor_data, all_predictions, weather)


@router.get("/recommend/{pond_id}")
def get_recommendation(pond_id: str):
    if pond_id not in VALID_PONDS:
        raise HTTPException(status_code=404, detail="Pond not found")
    prediction_result, watchdog_result = _get_pond_prediction_and_watchdog(pond_id)
    return llm_agent.get_recommendation(pond_id, prediction_result, watchdog_result)


@router.post("/ask")
def ask_question(body: AskRequest):
    sensor_data = simulator.get_current_data()
    audit_log = escalation_engine.get_audit_log(limit=50)
    return llm_agent.answer_question(
        body.question, body.pond_id, sensor_data, audit_log
    )


@router.get("/log")
def get_call_log():
    return llm_agent.get_call_log(limit=20)
