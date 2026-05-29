from fastapi import APIRouter, HTTPException

from core.sensor_simulator import simulator
from core.weather_client import weather_client
from ml.watchdog import watchdog

router = APIRouter()

VALID_PONDS = ["pond_1", "pond_2", "pond_3"]


@router.get("/")
def validate_all():
    sensor_data = simulator.get_current_data()
    weather_data = weather_client.get_weather()
    return watchdog.validate_all_ponds(sensor_data, weather_data)


@router.get("/alerts/faulty")
def get_faulty_alerts():
    sensor_data = simulator.get_current_data()
    weather_data = weather_client.get_weather()
    results = watchdog.validate_all_ponds(sensor_data, weather_data)
    faulty = []
    for pond_id, result in results.items():
        for sensor_name, info in result["sensors"].items():
            if info["status"] == "FAULTY":
                violation_msgs = [
                    v["message"]
                    for v in result["physics_violations"]
                    if v["sensor"] == sensor_name
                ]
                faulty.append({
                    "pond_id": pond_id,
                    "sensor_name": sensor_name,
                    "value": info["value"],
                    "confidence": info["confidence"],
                    "message": violation_msgs[0] if violation_msgs else "Sensor flagged as FAULTY",
                })
    return faulty


@router.get("/alerts/suspicious")
def get_suspicious_alerts():
    sensor_data = simulator.get_current_data()
    weather_data = weather_client.get_weather()
    results = watchdog.validate_all_ponds(sensor_data, weather_data)
    suspicious = []
    for pond_id, result in results.items():
        for sensor_name, info in result["sensors"].items():
            if info["status"] == "SUSPICIOUS":
                violation_msgs = [
                    v["message"]
                    for v in result["physics_violations"]
                    if v["sensor"] == sensor_name
                ]
                suspicious.append({
                    "pond_id": pond_id,
                    "sensor_name": sensor_name,
                    "value": info["value"],
                    "confidence": info["confidence"],
                    "message": violation_msgs[0] if violation_msgs else "Sensor flagged as SUSPICIOUS",
                })
    return suspicious


@router.get("/{pond_id}")
def validate_pond(pond_id: str):
    if pond_id not in VALID_PONDS:
        raise HTTPException(status_code=404, detail=f"Pond '{pond_id}' not found. Valid: pond_1, pond_2, pond_3")
    sensor_data = simulator.get_current_data()
    if pond_id not in sensor_data.get("ponds", {}):
        raise HTTPException(status_code=404, detail="Pond not found")
    weather_data = weather_client.get_weather()
    pond = sensor_data["ponds"][pond_id]
    sensor_readings = {name: info["value"] for name, info in pond["sensors"].items()}
    return watchdog.validate_pond(pond_id, sensor_readings, weather_data)
