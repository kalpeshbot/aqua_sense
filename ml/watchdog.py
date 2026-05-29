import json
import random
from datetime import datetime

import numpy as np
from sklearn.ensemble import IsolationForest


class SensorWatchdog:
    def __init__(self):
        with open("data/normal_pond_profile.json", "r", encoding="utf-8") as f:
            self.profile = json.load(f)
        self.sensor_names = [
            "pH",
            "dissolved_oxygen",
            "turbidity",
            "ammonia",
            "temperature",
        ]
        self.isolation_forests = {}
        self.is_trained = False
        self._generate_training_data()
        self._train_models()

    def _generate_training_data(self):
        self.training_data = {}
        for sensor_name in self.sensor_names:
            p = self.profile[sensor_name]
            mean = p["typical"]
            std = (p["max"] - p["min"]) / 6
            self.training_data[sensor_name] = [
                random.gauss(mean, std) for _ in range(1000)
            ]

    def _train_models(self):
        for sensor_name in self.sensor_names:
            model = IsolationForest(
                contamination=0.05, random_state=42, n_estimators=100
            )
            values = np.array(self.training_data[sensor_name]).reshape(-1, 1)
            model.fit(values)
            self.isolation_forests[sensor_name] = model
        self.is_trained = True
        print("SensorWatchdog: All 5 Isolation Forest models trained successfully.")

    def check_isolation_forest(self, sensor_name, value):
        model = self.isolation_forests[sensor_name]
        prediction = model.predict([[value]])[0]
        raw_score = float(model.decision_function([[value]])[0])
        confidence = min(100, max(0, int((raw_score + 0.5) * 100)))
        return {
            "is_anomaly": prediction == -1,
            "confidence": confidence,
            "raw_score": raw_score,
        }

    def check_physics_rules(self, sensor_readings, weather_data=None):
        violations = []
        temp = sensor_readings["temperature"]
        do_val = sensor_readings["dissolved_oxygen"]
        ammonia_val = sensor_readings["ammonia"]
        ph_val = sensor_readings["pH"]
        turb = sensor_readings["turbidity"]

        max_do = (
            14.62
            - (0.3898 * temp)
            + (0.006969 * temp**2)
            - (0.00005896 * temp**3)
        )
        if do_val > max_do + 0.5:
            violations.append(
                {
                    "rule": "temp_vs_DO",
                    "sensor": "dissolved_oxygen",
                    "message": (
                        f"DO of {do_val}mg/L is physically impossible at {temp}°C. "
                        f"Max solubility is {max_do:.2f}mg/L."
                    ),
                    "severity": "FAULTY",
                }
            )

        if ammonia_val > 1.8 and ph_val > 7.8:
            violations.append(
                {
                    "rule": "ammonia_vs_pH",
                    "sensor": "ammonia",
                    "message": (
                        f"Ammonia {ammonia_val}ppm and pH {ph_val} cannot coexist. "
                        "Cross-sensor conflict."
                    ),
                    "severity": "SUSPICIOUS",
                }
            )

        hour = datetime.now().hour
        if 1 <= hour <= 6 and do_val > 9.0:
            violations.append(
                {
                    "rule": "DO_night_spike",
                    "sensor": "dissolved_oxygen",
                    "message": (
                        f"DO spike of {do_val}mg/L at {hour}:00 is impossible "
                        "with no photosynthesis."
                    ),
                    "severity": "FAULTY",
                }
            )

        if weather_data is not None:
            rain = weather_data.get("rainfall_mm_hr", 0)
            if rain > 5 and turb < 8:
                violations.append(
                    {
                        "rule": "rain_vs_turbidity",
                        "sensor": "turbidity",
                        "message": (
                            f"Rainfall of {rain}mm/hr but turbidity is only {turb}. "
                            "Sensor may be stuck."
                        ),
                        "severity": "SUSPICIOUS",
                    }
                )

        return violations

    def _estimate_faulty_value(self, sensor_name, sensor_readings):
        if sensor_name == "pH":
            return self.profile["pH"]["typical"]
        if sensor_name == "dissolved_oxygen":
            temp = sensor_readings["temperature"]
            return (
                14.62
                - (0.3898 * temp)
                + (0.006969 * temp**2)
                - (0.00005896 * temp**3)
            )
        return self.profile[sensor_name]["typical"]

    def validate_pond(self, pond_id, sensor_readings, weather_data=None):
        isolation_results = {}
        for sensor_name in self.sensor_names:
            isolation_results[sensor_name] = self.check_isolation_forest(
                sensor_name, sensor_readings[sensor_name]
            )

        physics_violations = self.check_physics_rules(sensor_readings, weather_data)

        faulty_sensors = {
            v["sensor"] for v in physics_violations if v["severity"] == "FAULTY"
        }
        suspicious_sensors = {
            v["sensor"] for v in physics_violations if v["severity"] == "SUSPICIOUS"
        }

        sensors_out = {}
        valid_count = 0

        for sensor_name in self.sensor_names:
            iso = isolation_results[sensor_name]
            value = sensor_readings[sensor_name]

            if sensor_name in faulty_sensors:
                status = "FAULTY"
                estimated = self._estimate_faulty_value(sensor_name, sensor_readings)
            elif sensor_name in suspicious_sensors or iso["is_anomaly"]:
                status = "SUSPICIOUS"
                estimated = None
            else:
                status = "VALID"
                valid_count += 1
                estimated = None

            sensors_out[sensor_name] = {
                "value": value,
                "status": status,
                "confidence": iso["confidence"],
                "estimated_value": estimated,
            }

        confidences = [isolation_results[s]["confidence"] for s in self.sensor_names]
        cross_sensor_score = round(sum(confidences) / len(confidences), 2)
        violation_count = len(physics_violations)

        if cross_sensor_score >= 75 and violation_count == 0:
            false_alarm_risk = "LOW"
        elif cross_sensor_score >= 50 or violation_count == 1:
            false_alarm_risk = "MEDIUM"
        else:
            false_alarm_risk = "HIGH"

        faulty_count = sum(1 for s in sensors_out.values() if s["status"] == "FAULTY")
        if faulty_count > 0:
            system_verdict = f"CAUTION — {faulty_count} sensor{'s' if faulty_count > 1 else ''} FAULTY"
        elif valid_count == 5:
            system_verdict = "TRUSTWORTHY — 5/5 sensors VALID"
        else:
            suspicious_count = 5 - valid_count
            system_verdict = (
                f"CAUTION — {suspicious_count} sensor{'s' if suspicious_count > 1 else ''} SUSPICIOUS"
            )

        return {
            "pond_id": pond_id,
            "timestamp": datetime.now().isoformat(),
            "sensors": sensors_out,
            "physics_violations": physics_violations,
            "cross_sensor_score": cross_sensor_score,
            "false_alarm_risk": false_alarm_risk,
            "system_verdict": system_verdict,
        }

    def validate_all_ponds(self, sensor_data, weather_data=None):
        results = {}
        for pond_id, pond in sensor_data.get("ponds", {}).items():
            sensor_readings = {
                name: info["value"] for name, info in pond["sensors"].items()
            }
            results[pond_id] = self.validate_pond(
                pond_id, sensor_readings, weather_data
            )
        return results


watchdog = SensorWatchdog()
