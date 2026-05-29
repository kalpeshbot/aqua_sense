"""Retrain ML models on demand. Models auto-train at import; run this script to force retrain."""

from ml.prediction_model import PredictionModel
from ml.watchdog import SensorWatchdog


def main():
    print("Retraining SensorWatchdog...")
    SensorWatchdog()
    print("Retraining PredictionModel...")
    PredictionModel()
    print("All models retrained successfully.")


if __name__ == "__main__":
    main()
