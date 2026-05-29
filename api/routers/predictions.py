from fastapi import APIRouter, HTTPException

from core.sensor_simulator import simulator
from core.weather_client import weather_client
from ml.feature_engineering import feature_engineer
from ml.prediction_model import prediction_model
from ml.watchdog import watchdog

router = APIRouter()

VALID_PONDS = ["pond_1", "pond_2", "pond_3"]


def _get_pond_prediction(pond_id: str):
    if pond_id not in VALID_PONDS:
        raise HTTPException(status_code=404, detail="Pond not found")
    sensor_data = simulator.get_current_data()
    if pond_id not in sensor_data.get("ponds", {}):
        raise HTTPException(status_code=404, detail="Pond not found")
    weather_features = weather_client.get_pond_impact_features()
    weather_data = weather_client.get_weather()

    pond = sensor_data["ponds"][pond_id]
    sensor_readings = {name: info["value"] for name, info in pond["sensors"].items()}
    validation = watchdog.validate_pond(pond_id, sensor_readings, weather_data)

    sensor_dict = {}
    for name, info in validation["sensors"].items():
        if info["status"] == "FAULTY" and info["estimated_value"] is not None:
            sensor_dict[name] = info["estimated_value"]
        else:
            sensor_dict[name] = info["value"]

    previous = prediction_model.reading_history.get(pond_id, [])
    fv = feature_engineer.build_feature_vector(
        pond_id, sensor_dict, weather_features, previous_readings=previous or None
    )
    return prediction_model.predict_pond(pond_id, fv, sensor_dict)


@router.get("/")
def predict_all():
    sensor_data = simulator.get_current_data()
    weather_features = weather_client.get_pond_impact_features()
    return prediction_model.predict_all_ponds(sensor_data, weather_features)


@router.get("/{pond_id}/risk")
def get_pond_risk(pond_id: str):
    result = _get_pond_prediction(pond_id)
    return {
        "risk_level": result["risk_level"],
        "risk_index": result["risk_index"],
        "confidence_percent": result["confidence_percent"],
        "probabilities": result["probabilities"],
    }


@router.get("/{pond_id}/forecast")
def get_pond_forecast(pond_id: str):
    result = _get_pond_prediction(pond_id)
    return {"sensor_forecasts": result["sensor_forecasts"]}


@router.get("/{pond_id}/urgency")
def get_pond_urgency(pond_id: str):
    result = _get_pond_prediction(pond_id)
    return {
        "urgency_score": result["urgency_score"],
        "escalation_timer_mins": result["escalation_timer_mins"],
    }


@router.get("/{pond_id}")
def predict_pond(pond_id: str):
    return _get_pond_prediction(pond_id)
