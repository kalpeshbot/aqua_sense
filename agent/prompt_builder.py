import json


class PromptBuilder:
    def build_recommendation_prompt(
        self,
        pond_id,
        sensor_readings,
        risk_level,
        urgency_score,
        weather_summary,
        watchdog_summary,
        forecast_summary,
    ):
        return f"""You are AquaSense, an expert aquaculture AI assistant for autonomous fish farm management.

POND: {pond_id}

CURRENT SENSOR READINGS:
{json.dumps(sensor_readings, indent=2)}

RISK LEVEL: {risk_level}
URGENCY SCORE: {urgency_score} (0-100)

WEATHER CONTEXT:
{weather_summary}

WATCHDOG VALIDATION:
{json.dumps(watchdog_summary, indent=2)}

30-MINUTE SENSOR FORECAST (6 readings per sensor at 5-min intervals):
{json.dumps(forecast_summary, indent=2)}

Based on the above data, recommend the best corrective action for this pond.

Respond ONLY with a JSON object — no preamble, no explanation outside JSON.
Use this exact structure:
{{
  "recommended_chemical": "calcium_oxide|sodium_thiosulfate|potassium_permanganate|aeration_pump|fish_feed|none",
  "dose_amount": 0.0,
  "dose_unit": "L|mins|kg",
  "primary_concern": "one sentence describing the most dangerous sensor and why",
  "reasoning": "2-3 sentences explaining your full reasoning chain",
  "confidence": 0,
  "safe_to_feed": true,
  "watch_sensors": ["sensor_name"]
}}

Respond with only the JSON object. No text before or after."""

    def build_explanation_prompt(
        self, question, pond_id, sensor_readings, recent_events, risk_level
    ):
        return f"""You are AquaSense AI assistant for an aquaculture fish farm.

POND: {pond_id}
CURRENT RISK LEVEL: {risk_level}

CURRENT POND SENSOR STATE:
{json.dumps(sensor_readings, indent=2)}

RECENT AUDIT / ESCALATION EVENTS (last 5):
{json.dumps(recent_events, indent=2)}

USER QUESTION: {question}

Answer the user's question based on the data above.

Respond ONLY with a JSON object — no preamble, no explanation outside JSON.
Use this exact structure:
{{
  "answer": "clear answer in plain English",
  "confidence": 0,
  "data_used": ["list of data points used"],
  "follow_up": "one suggested follow-up question"
}}

Respond with only the JSON object. No text before or after."""

    def build_farm_summary_prompt(self, all_ponds_data, all_predictions, weather):
        return f"""You are AquaSense AI assistant. Summarize the entire fish farm status for the operator dashboard.

ALL PONDS SENSOR DATA:
{json.dumps(all_ponds_data, indent=2)}

ALL PONDS PREDICTIONS (risk, urgency, forecasts):
{json.dumps(all_predictions, indent=2)}

CURRENT WEATHER:
{json.dumps(weather, indent=2)}

Provide an overall farm status summary.

Respond ONLY with a JSON object — no preamble, no explanation outside JSON.
Use this exact structure:
{{
  "overall_status": "ALL_CLEAR|MONITORING|ATTENTION_NEEDED|CRITICAL",
  "summary_sentence": "one sentence plain English summary for dashboard",
  "pond_summaries": {{
    "pond_1": "one sentence",
    "pond_2": "one sentence",
    "pond_3": "one sentence"
  }},
  "top_priority": "which pond needs attention most and why, one sentence",
  "recommendation": "what the operator should do right now, one sentence"
}}

Respond with only the JSON object. No text before or after."""


prompt_builder = PromptBuilder()
