import json
import random
from datetime import datetime

import numpy as np
from xgboost import XGBClassifier

from ml.feature_engineering import feature_engineer


class PredictionModel:
    FEATURE_ORDER = [
        "sensor_pH",
        "sensor_dissolved_oxygen",
        "sensor_turbidity",
        "sensor_ammonia",
        "sensor_temperature",
        "delta_pH",
        "delta_dissolved_oxygen",
        "delta_turbidity",
        "delta_ammonia",
        "delta_temperature",
        "dev_pH",
        "dev_dissolved_oxygen",
        "dev_turbidity",
        "dev_ammonia",
        "dev_temperature",
        "weather_rain_intensity",
        "weather_air_temp_delta",
        "weather_wind_turbidity_factor",
        "weather_humidity_factor",
        "weather_cloud_o2_suppression",
        "weather_uv_algae_risk",
        "time_hour",
        "time_is_night",
        "time_season_encoded",
        "time_night_o2_risk",
        "interact_rain_x_turbidity",
        "interact_temp_x_DO",
        "interact_night_x_DO",
    ]

    def __init__(self):
        self.risk_labels = ["SAFE", "WATCH", "WARNING", "CRITICAL"]
        self.risk_colors = {
            "SAFE": "green",
            "WATCH": "yellow",
            "WARNING": "orange",
            "CRITICAL": "red",
        }
        self.feature_order = self.FEATURE_ORDER
        self.classifier = None
        self.is_trained = False
        self.reading_history = {"pond_1": [], "pond_2": [], "pond_3": []}
        with open("data/normal_pond_profile.json", "r", encoding="utf-8") as f:
            self.profile = json.load(f)
        self._generate_training_data()
        self._train_classifier()

    def _make_weather_features(self, rain=0.0, air_delta=0.0, wind=0.2, humidity=0.7, cloud=0.3, uv=0.5):
        return {
            "rain_intensity": rain,
            "air_temp_delta": air_delta,
            "wind_turbidity_factor": wind,
            "humidity_concentration_factor": humidity,
            "cloud_o2_suppression": cloud,
            "uv_algae_risk": uv,
            "is_raining": rain > 1.0,
            "rain_impact_level": "NONE" if rain == 0 else "LIGHT",
        }

    def _generate_training_data(self):
        baseline = feature_engineer.baseline
        self.X_train = []
        self.y_train = []

        class_configs = [
            (0, 500, "SAFE"),
            (1, 500, "WATCH"),
            (2, 500, "WARNING"),
            (3, 500, "CRITICAL"),
        ]

        for label, count, risk_class in class_configs:
            for _ in range(count):
                sensors = {}
                for name in feature_engineer.sensor_names:
                    p = self.profile[name]
                    typical = p["typical"]

                    if risk_class == "SAFE":
                        sensors[name] = typical + random.gauss(0, (p["max"] - p["min"]) / 20)
                    elif risk_class == "WATCH":
                        if random.random() < 0.3:
                            sensors[name] = typical + (p["max"] - typical) * 0.4
                        else:
                            sensors[name] = typical + random.gauss(0, (p["max"] - p["min"]) / 15)
                    elif risk_class == "WARNING":
                        if random.random() < 0.5:
                            sensors[name] = p["max"] - (p["max"] - typical) * 0.1
                        else:
                            sensors[name] = typical + random.gauss(0, (p["max"] - p["min"]) / 10)
                    else:
                        pick = random.choice(feature_engineer.sensor_names)
                        if name == pick:
                            sensors[name] = p["critical_high"] - random.uniform(0, 0.2)
                        else:
                            sensors[name] = typical + random.gauss(0, (p["max"] - p["min"]) / 8)

                    sensors[name] = max(0, round(sensors[name], 2))

                if risk_class == "SAFE":
                    weather = self._make_weather_features(0, 0, 0.15, 0.65, 0.2, 0.4)
                elif risk_class == "WATCH":
                    weather = self._make_weather_features(
                        random.uniform(0, 2), 1, 0.3, 0.7, 0.4, 0.5
                    )
                elif risk_class == "WARNING":
                    weather = self._make_weather_features(
                        random.uniform(2, 8), 2, 0.5, 0.8, 0.6, 0.6
                    )
                else:
                    weather = self._make_weather_features(
                        random.uniform(5, 15), 4, 0.7, 0.85, 0.8, 0.7
                    )

                fv = feature_engineer.build_feature_vector(
                    "pond_1", sensors, weather
                )
                self.X_train.append(fv)
                self.y_train.append(label)

    def _train_classifier(self):
        X = np.array(
            [[sample[k] for k in self.feature_order] for sample in self.X_train]
        )
        y = np.array(self.y_train)
        self.classifier = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
            eval_metric="mlogloss",
        )
        self.classifier.fit(X, y)
        self.is_trained = True
        print("PredictionModel: XGBoost classifier trained on 2000 synthetic samples.")

    def _feature_dict_to_array(self, feature_dict):
        return np.array([[feature_dict[k] for k in self.feature_order]])

    def classify_risk(self, feature_vector):
        X = self._feature_dict_to_array(feature_vector)
        pred = int(self.classifier.predict(X)[0])
        proba = self.classifier.predict_proba(X)[0]
        probabilities = {
            self.risk_labels[i]: float(proba[i]) for i in range(len(self.risk_labels))
        }
        return {
            "risk_level": self.risk_labels[pred],
            "risk_index": pred,
            "confidence_percent": int(max(proba) * 100),
            "probabilities": probabilities,
        }

    def calculate_urgency_score(self, feature_vector, risk_result):
        risk_norm = risk_result["risk_index"] / 3.0
        do = feature_vector["sensor_dissolved_oxygen"]
        do_danger = max(0, (6.5 - do) / 6.5)

        ph = feature_vector["sensor_pH"]
        ph_danger = max(0, (6.5 - ph) / 6.5) + max(0, (ph - 8.5) / 0.5)
        ph_danger = min(1.0, ph_danger)

        ammonia = feature_vector["sensor_ammonia"]
        ammonia_danger = min(1.0, ammonia / 2.0)

        rain = feature_vector["weather_rain_intensity"]
        rain_danger = min(1.0, rain / 10.0)

        weighted = (
            0.30 * risk_norm
            + 0.25 * do_danger
            + 0.20 * ph_danger
            + 0.15 * ammonia_danger
            + 0.10 * rain_danger
        )
        urgency_score = int(round(weighted * 100))

        if urgency_score <= 40:
            escalation_timer_mins = None
        elif urgency_score <= 60:
            escalation_timer_mins = 45
        elif urgency_score <= 80:
            escalation_timer_mins = 30
        elif urgency_score <= 90:
            escalation_timer_mins = 15
        else:
            escalation_timer_mins = 5

        return {
            "urgency_score": urgency_score,
            "escalation_timer_mins": escalation_timer_mins,
        }

    def forecast_sensor(self, sensor_name, history_values, steps=6):
        if not history_values:
            history_values = [self.profile[sensor_name]["typical"]]

        alpha = 0.3
        last_actual = history_values[-1]
        forecast = []
        prev_forecast = last_actual

        trend = 0.0
        if len(history_values) >= 2:
            x = np.arange(len(history_values[-6:]))
            y = np.array(history_values[-6:])
            trend = float(np.polyfit(x, y, 1)[0])

        p = self.profile[sensor_name]
        low = p["critical_low"] - 1
        high = p["critical_high"] + 1

        for step in range(1, steps + 1):
            next_val = alpha * last_actual + (1 - alpha) * prev_forecast
            next_val += trend * step
            next_val = max(low, min(high, next_val))
            forecast.append(round(float(next_val), 2))
            prev_forecast = next_val

        return forecast

    def forecast_all_sensors(self, pond_id, current_sensor_readings):
        history = self.reading_history[pond_id]
        history.append(dict(current_sensor_readings))
        if len(history) > 12:
            history = history[-12:]
        self.reading_history[pond_id] = history

        forecasts = {}
        for sensor_name in feature_engineer.sensor_names:
            values = [h[sensor_name] for h in history]
            forecasts[sensor_name] = self.forecast_sensor(sensor_name, values)
        return forecasts

    def predict_pond(self, pond_id, feature_vector, current_sensor_readings):
        risk_result = self.classify_risk(feature_vector)
        urgency = self.calculate_urgency_score(feature_vector, risk_result)
        forecasts = self.forecast_all_sensors(pond_id, current_sensor_readings)

        return {
            "pond_id": pond_id,
            "timestamp": datetime.now().isoformat(),
            "risk_level": risk_result["risk_level"],
            "risk_index": risk_result["risk_index"],
            "confidence_percent": risk_result["confidence_percent"],
            "probabilities": risk_result["probabilities"],
            "urgency_score": urgency["urgency_score"],
            "escalation_timer_mins": urgency["escalation_timer_mins"],
            "sensor_forecasts": forecasts,
            "forecast_interval_mins": 5,
            "forecast_horizon_mins": 30,
        }

    def predict_all_ponds(self, sensor_data, weather_features):
        from core.weather_client import weather_client
        from ml.watchdog import watchdog

        weather_data = weather_client.get_weather()
        validations = watchdog.validate_all_ponds(sensor_data, weather_data)
        results = {}

        for pond_id, pond in sensor_data.get("ponds", {}).items():
            validation = validations[pond_id]
            sensor_dict = {}
            for name, info in validation["sensors"].items():
                if info["status"] == "FAULTY" and info["estimated_value"] is not None:
                    sensor_dict[name] = info["estimated_value"]
                else:
                    sensor_dict[name] = info["value"]

            previous = self.reading_history.get(pond_id, [])
            fv = feature_engineer.build_feature_vector(
                pond_id, sensor_dict, weather_features, previous_readings=previous or None
            )
            results[pond_id] = self.predict_pond(pond_id, fv, sensor_dict)

        return results


prediction_model = PredictionModel()
