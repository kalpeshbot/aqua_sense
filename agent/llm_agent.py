import json
import os
from datetime import datetime

import ollama
from dotenv import load_dotenv

from agent.prompt_builder import prompt_builder

load_dotenv()

FALLBACK_RECOMMENDATION = {
    "recommended_chemical": "none",
    "dose_amount": 0,
    "dose_unit": "L",
    "primary_concern": "LLM unavailable",
    "reasoning": "Could not generate reasoning.",
    "confidence": 0,
    "safe_to_feed": True,
    "watch_sensors": [],
}


class LLMAgent:
    def __init__(self):
        self.model = os.getenv("OLLAMA_MODEL", "mistral:latest")
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.client = ollama.Client(host=self.base_url)
        self.call_log = []
        self.max_retries = 3
        self._call_counter = 0

    def _call_ollama(self, prompt, call_type="unknown"):
        self._call_counter += 1
        response_text = ""
        success = True

        try:
            response = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
            )
            response_text = response["message"]["content"]
        except Exception as e:
            success = False
            response_text = '{"error": "Ollama not available", "raw": "' + str(e)[:100] + '"}'

        self.call_log.append(
            {
                "call_id": self._call_counter,
                "call_type": call_type,
                "timestamp": datetime.now().isoformat(),
                "prompt_length": len(prompt),
                "response_length": len(response_text),
                "success": success,
            }
        )

        return response_text

    def _parse_json_response(self, response_text):
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass

        start = response_text.find("{")
        end = response_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(response_text[start : end + 1])
            except json.JSONDecodeError:
                pass

        return {
            "error": "LLM response could not be parsed",
            "raw": response_text[:200],
        }

    def get_recommendation(self, pond_id, prediction_result, watchdog_result):
        from core.weather_client import weather_client

        sensor_readings = {}
        for name, info in watchdog_result.get("sensors", {}).items():
            if info.get("status") == "FAULTY" and info.get("estimated_value") is not None:
                sensor_readings[name] = info["estimated_value"]
            else:
                sensor_readings[name] = info.get("value")

        weather = weather_client.get_weather()
        weather_summary = (
            f"Temperature: {weather['temperature_c']}°C, "
            f"Humidity: {weather['humidity_percent']}%, "
            f"Rainfall: {weather['rainfall_mm_hr']}mm/hr, "
            f"Condition: {weather['weather_condition']}"
        )

        watchdog_summary = {
            "system_verdict": watchdog_result.get("system_verdict"),
            "false_alarm_risk": watchdog_result.get("false_alarm_risk"),
            "sensors": {
                name: info["status"]
                for name, info in watchdog_result.get("sensors", {}).items()
            },
            "physics_violations": watchdog_result.get("physics_violations", []),
        }

        forecast_summary = prediction_result.get("sensor_forecasts", {})

        prompt = prompt_builder.build_recommendation_prompt(
            pond_id=pond_id,
            sensor_readings=sensor_readings,
            risk_level=prediction_result.get("risk_level", "SAFE"),
            urgency_score=prediction_result.get("urgency_score", 0),
            weather_summary=weather_summary,
            watchdog_summary=watchdog_summary,
            forecast_summary=forecast_summary,
        )

        raw = self._call_ollama(prompt, call_type="recommendation")
        parsed = self._parse_json_response(raw)

        if "error" in parsed:
            return dict(FALLBACK_RECOMMENDATION)

        return parsed

    def answer_question(self, question, pond_id, sensor_data, audit_log):
        pond = sensor_data.get("ponds", {}).get(pond_id, {})
        sensor_readings = {
            name: info["value"] for name, info in pond.get("sensors", {}).items()
        }
        risk_level = pond.get("risk_level", "UNKNOWN")
        recent_events = audit_log[-5:] if audit_log else []

        prompt = prompt_builder.build_explanation_prompt(
            question=question,
            pond_id=pond_id,
            sensor_readings=sensor_readings,
            recent_events=recent_events,
            risk_level=risk_level,
        )

        raw = self._call_ollama(prompt, call_type="explanation")
        parsed = self._parse_json_response(raw)

        if "error" in parsed:
            return {
                "answer": "I could not process your question at this time.",
                "confidence": 0,
                "data_used": [],
                "follow_up": "Please try again when the LLM service is available.",
            }

        return parsed

    def get_farm_summary(self, sensor_data, all_predictions, weather):
        all_ponds_data = {}
        for pond_id, pond in sensor_data.get("ponds", {}).items():
            all_ponds_data[pond_id] = {
                "name": pond.get("name"),
                "fish_species": pond.get("fish_species"),
                "risk_level": pond.get("risk_level"),
                "sensors": {
                    name: info["value"]
                    for name, info in pond.get("sensors", {}).items()
                },
            }

        prompt = prompt_builder.build_farm_summary_prompt(
            all_ponds_data=all_ponds_data,
            all_predictions=all_predictions,
            weather=weather,
        )

        raw = self._call_ollama(prompt, call_type="farm_summary")
        parsed = self._parse_json_response(raw)

        if "error" in parsed:
            return {
                "overall_status": "MONITORING",
                "summary_sentence": "Farm summary unavailable — LLM service not responding.",
                "pond_summaries": {
                    "pond_1": "Status unknown.",
                    "pond_2": "Status unknown.",
                    "pond_3": "Status unknown.",
                },
                "top_priority": "Check system connectivity.",
                "recommendation": "Verify Ollama is running locally.",
            }

        return parsed

    def get_call_log(self, limit=20):
        return self.call_log[-limit:]


llm_agent = LLMAgent()
