from fastapi import APIRouter, HTTPException

from core.sensor_simulator import simulator

router = APIRouter()


@router.get("/")
def get_all_ponds():
    return simulator.get_current_data()


@router.get("/{pond_id}")
def get_pond(pond_id: str):
    data = simulator.get_current_data()
    ponds = data.get("ponds", {})
    if pond_id not in ponds:
        raise HTTPException(status_code=404, detail="Pond not found")
    return ponds[pond_id]


@router.get("/{pond_id}/sensors")
def get_pond_sensors(pond_id: str):
    data = simulator.get_current_data()
    ponds = data.get("ponds", {})
    if pond_id not in ponds:
        raise HTTPException(status_code=404, detail="Pond not found")
    return ponds[pond_id]["sensors"]
