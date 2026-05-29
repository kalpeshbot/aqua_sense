import json
import random
from datetime import datetime

SENSOR_DATA_FILE = "data/sensor_data.json"
PROFILE_FILE = "data/normal_pond_profile.json"

SENSOR_NAMES = ["pH", "dissolved_oxygen", "turbidity", "ammonia", "temperature"]

ANOMALY_TYPES = [
    "pH_crash",
    "oxygen_drop",
    "ammonia_spike",
    "turbidity_surge",
    "temp_spike",
]


class SensorSimulator:
    def __init__(self):
        with open(SENSOR_DATA_FILE, "r", encoding="utf-8") as f:
            self.pond_data = json.load(f)
        with open(PROFILE_FILE, "r", encoding="utf-8") as f:
            self.profile = json.load(f)
        self.tick = 0
        self.anomaly_active = {}

    def generate_reading(self, pond_id, sensor_name, current_value):
        typical = self.profile[sensor_name]["typical"]
        noise = random.gauss(0, 0.02) * typical
        new_value = current_value + noise

        if self.tick > 0 and self.tick % 10 == 0:
            drift = random.uniform(-0.005, 0.005) * typical
            new_value += drift

        new_value = max(0, new_value)
        return round(new_value, 2)

    def inject_anomaly(self, pond_id):
        sensor_name = random.choice(SENSOR_NAMES)
        anomaly_type = random.choice(ANOMALY_TYPES)

        pond = self.pond_data["ponds"][pond_id]
        sensors = pond["sensors"]

        if anomaly_type == "pH_crash":
            sensors["pH"]["value"] = round(random.uniform(5.2, 5.8), 2)
        elif anomaly_type == "oxygen_drop":
            sensors["dissolved_oxygen"]["value"] = round(random.uniform(2.5, 3.8), 2)
        elif anomaly_type == "ammonia_spike":
            sensors["ammonia"]["value"] = round(random.uniform(2.2, 3.5), 2)
        elif anomaly_type == "turbidity_surge":
            sensors["turbidity"]["value"] = round(random.uniform(35, 55), 2)
        elif anomaly_type == "temp_spike":
            sensors["temperature"]["value"] = round(random.uniform(34, 36.5), 2)

        self.anomaly_active[pond_id] = {
            "type": anomaly_type,
            "sensor": sensor_name,
            "tick": self.tick,
        }
        return sensors

    def calculate_status(self, sensor_name, value):
        profile = self.profile[sensor_name]
        min_val = profile["min"]
        max_val = profile["max"]
        critical_low = profile["critical_low"]
        critical_high = profile["critical_high"]

        if value <= critical_low or value >= critical_high:
            return "CRITICAL"

        low_buffer = min_val - critical_low
        high_buffer = critical_high - max_val

        if low_buffer > 0 and value <= critical_low + 0.1 * low_buffer:
            return "WARNING"
        if high_buffer > 0 and value >= critical_high - 0.1 * high_buffer:
            return "WARNING"

        if min_val <= value <= max_val:
            return "NORMAL"

        return "WARNING"

    def update_all_ponds(self):
        for pond_id, pond in self.pond_data["ponds"].items():
            for sensor_name, sensor_info in pond["sensors"].items():
                current_value = sensor_info["value"]
                new_value = self.generate_reading(pond_id, sensor_name, current_value)
                sensor_info["value"] = new_value

            if random.random() < 0.02:
                self.inject_anomaly(pond_id)

            for sensor_name, sensor_info in pond["sensors"].items():
                status = self.calculate_status(sensor_name, sensor_info["value"])
                sensor_info["status"] = status

        self.pond_data["last_updated"] = datetime.now().isoformat()
        self.tick += 1

        with open(SENSOR_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.pond_data, f, indent=2)

    def get_current_data(self):
        with open(SENSOR_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)


simulator = SensorSimulator()
