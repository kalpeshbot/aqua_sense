from fastapi import APIRouter

from core.sensor_simulator import simulator

router = APIRouter()


@router.get("/")
def get_sensor_summary():
    data = simulator.get_current_data()
    summary = {}

    for pond_id, pond in data.get("ponds", {}).items():
        summary[pond_id] = {}
        for sensor_name, sensor_info in pond["sensors"].items():
            summary[pond_id][sensor_name] = {
                "value": sensor_info["value"],
                "unit": sensor_info["unit"],
                "status": sensor_info["status"],
            }

    return summary


@router.get("/critical")
def get_critical_sensors():
    data = simulator.get_current_data()
    critical = []

    for pond_id, pond in data.get("ponds", {}).items():
        for sensor_name, sensor_info in pond["sensors"].items():
            if sensor_info["status"] == "CRITICAL":
                critical.append({
                    "pond_id": pond_id,
                    "sensor": sensor_name,
                    "value": sensor_info["value"],
                    "unit": sensor_info["unit"],
                    "status": sensor_info["status"],
                })

    return critical


@router.get("/warnings")
def get_warning_sensors():
    data = simulator.get_current_data()
    warnings = []

    for pond_id, pond in data.get("ponds", {}).items():
        for sensor_name, sensor_info in pond["sensors"].items():
            if sensor_info["status"] == "WARNING":
                warnings.append({
                    "pond_id": pond_id,
                    "sensor": sensor_name,
                    "value": sensor_info["value"],
                    "unit": sensor_info["unit"],
                    "status": sensor_info["status"],
                })

    return warnings
