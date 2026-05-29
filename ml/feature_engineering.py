from datetime import datetime


class FeatureEngineer:
    def __init__(self):
        self.sensor_names = [
            "pH",
            "dissolved_oxygen",
            "turbidity",
            "ammonia",
            "temperature",
        ]
        self.baseline = {
            "pH": 7.2,
            "dissolved_oxygen": 6.5,
            "turbidity": 9.0,
            "ammonia": 0.5,
            "temperature": 28.5,
        }

    def get_time_features(self):
        now = datetime.now()
        hour = now.hour
        month = now.month

        is_night = hour >= 22 or hour <= 5
        is_dawn = 5 <= hour <= 8
        day_of_week = now.weekday()
        is_weekend = day_of_week >= 5

        if 3 <= month <= 5:
            season = "summer"
        elif 6 <= month <= 9:
            season = "monsoon"
        else:
            season = "winter"

        if is_night:
            night_o2_risk_factor = 1.0
        elif is_dawn:
            night_o2_risk_factor = 0.5
        else:
            night_o2_risk_factor = 0.0

        return {
            "hour_of_day": hour,
            "is_night": is_night,
            "is_dawn": is_dawn,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "season": season,
            "night_o2_risk_factor": night_o2_risk_factor,
        }

    def build_feature_vector(
        self, pond_id, sensor_dict, weather_features, previous_readings=None
    ):
        time_feats = self.get_time_features()
        season_map = {"summer": 0, "monsoon": 1, "winter": 2}

        features = {}

        for name in self.sensor_names:
            value = float(sensor_dict[name])
            baseline = self.baseline[name]
            features[f"sensor_{name}"] = value

            if previous_readings:
                prev_val = float(previous_readings[-1][name])
                delta = value - prev_val
            else:
                delta = value - baseline
            features[f"delta_{name}"] = delta

            features[f"dev_{name}"] = (value - baseline) / baseline if baseline else 0.0

        features["weather_rain_intensity"] = float(
            weather_features["rain_intensity"]
        )
        features["weather_air_temp_delta"] = float(
            weather_features["air_temp_delta"]
        )
        features["weather_wind_turbidity_factor"] = float(
            weather_features["wind_turbidity_factor"]
        )
        features["weather_humidity_factor"] = float(
            weather_features["humidity_concentration_factor"]
        )
        features["weather_cloud_o2_suppression"] = float(
            weather_features["cloud_o2_suppression"]
        )
        features["weather_uv_algae_risk"] = float(weather_features["uv_algae_risk"])

        features["time_hour"] = time_feats["hour_of_day"]
        features["time_is_night"] = 1 if time_feats["is_night"] else 0
        features["time_season_encoded"] = season_map[time_feats["season"]]
        features["time_night_o2_risk"] = time_feats["night_o2_risk_factor"]

        features["interact_rain_x_turbidity"] = (
            features["weather_rain_intensity"] * features["sensor_turbidity"]
        )
        features["interact_temp_x_DO"] = (
            features["sensor_temperature"] * features["sensor_dissolved_oxygen"]
        )
        features["interact_night_x_DO"] = (
            features["time_night_o2_risk"] * features["sensor_dissolved_oxygen"]
        )

        return features

    def build_all_ponds(self, sensor_data, weather_features):
        result = {}
        for pond_id, pond in sensor_data.get("ponds", {}).items():
            sensor_dict = {
                name: info["value"] for name, info in pond["sensors"].items()
            }
            result[pond_id] = self.build_feature_vector(
                pond_id, sensor_dict, weather_features
            )
        return result


feature_engineer = FeatureEngineer()
