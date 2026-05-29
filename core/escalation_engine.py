import json
import threading
import uuid
from datetime import datetime, timedelta


class EscalationEngine:
    def __init__(self):
        self.audit_file = "data/audit_log.json"
        self.pending_approvals = {}
        self.timers = {}
        self._load_audit_log()

    def _load_audit_log(self):
        try:
            with open(self.audit_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.audit_log = data if isinstance(data, list) else []
        except (FileNotFoundError, json.JSONDecodeError):
            self.audit_log = []

    def _save_audit_log(self):
        with open(self.audit_file, "w", encoding="utf-8") as f:
            json.dump(self.audit_log, f, indent=2)

    def _get_degree(self, urgency_score):
        if urgency_score <= 40:
            return None
        if urgency_score <= 60:
            return {
                "degree": 1,
                "label": "DEGREE_1",
                "timer_mins": 45,
                "auto_execute": True,
            }
        if urgency_score <= 80:
            return {
                "degree": 2,
                "label": "DEGREE_2",
                "timer_mins": 30,
                "auto_execute": False,
            }
        return {
            "degree": 3,
            "label": "DEGREE_3",
            "timer_mins": 15,
            "auto_execute": False,
        }

    def _update_audit_event(self, event):
        for i, entry in enumerate(self.audit_log):
            if entry.get("event_id") == event["event_id"]:
                self.audit_log[i] = event
                return
        self.audit_log.append(event)

    def create_escalation_event(
        self,
        pond_id,
        urgency_score,
        risk_level,
        recommended_action,
        sensor_summary,
        llm_reasoning,
    ):
        degree = self._get_degree(urgency_score)
        if degree is None:
            return None

        event_id = str(uuid.uuid4())[:8]
        created_at = datetime.now()
        expires_at = created_at + timedelta(minutes=degree["timer_mins"])

        event = {
            "event_id": event_id,
            "pond_id": pond_id,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "degree": degree["degree"],
            "degree_label": degree["label"],
            "timer_mins": degree["timer_mins"],
            "auto_execute": degree["auto_execute"],
            "urgency_score": urgency_score,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "sensor_summary": sensor_summary,
            "llm_reasoning": llm_reasoning,
            "status": "PENDING",
            "resolved": False,
            "resolution": None,
            "resolved_at": None,
            "resolved_by": None,
        }

        self.pending_approvals[event_id] = event
        self.audit_log.append(event)
        self._save_audit_log()

        timer = threading.Timer(
            degree["timer_mins"] * 60, self._handle_timeout, args=[event_id]
        )
        timer.daemon = True
        timer.start()
        self.timers[event_id] = timer

        return event

    def _handle_timeout(self, event_id):
        if event_id not in self.pending_approvals:
            return

        event = self.pending_approvals[event_id]

        if event["auto_execute"]:
            event["status"] = "AUTO_EXECUTED"
            event["resolution"] = "System auto-executed after timeout"
            event["resolved"] = True
            event["resolved_at"] = datetime.now().isoformat()
            event["resolved_by"] = "SYSTEM"
            self._update_audit_event(event)
            self._save_audit_log()
            del self.pending_approvals[event_id]
            if event_id in self.timers:
                del self.timers[event_id]
        else:
            event["status"] = "ESCALATED"
            event["resolution"] = "No owner response — escalated to next degree"
            event["resolved"] = False
            new_degree = min(3, event["degree"] + 1)
            event["degree"] = new_degree
            event["degree_label"] = f"DEGREE_{new_degree}"
            event["timer_mins"] = 10
            event["auto_execute"] = False
            event["expires_at"] = (
                datetime.now() + timedelta(minutes=10)
            ).isoformat()

            self._update_audit_event(event)
            self._save_audit_log()

            if event_id in self.timers:
                try:
                    self.timers[event_id].cancel()
                except Exception:
                    pass

            timer = threading.Timer(10 * 60, self._handle_timeout, args=[event_id])
            timer.daemon = True
            timer.start()
            self.timers[event_id] = timer

    def approve_event(self, event_id, approved_by="owner"):
        if event_id not in self.pending_approvals:
            raise ValueError("Event not found or already resolved")

        if event_id in self.timers:
            self.timers[event_id].cancel()
            del self.timers[event_id]

        event = self.pending_approvals[event_id]
        event["status"] = "APPROVED"
        event["resolution"] = f"Approved by {approved_by}"
        event["resolved"] = True
        event["resolved_at"] = datetime.now().isoformat()
        event["resolved_by"] = approved_by

        self._update_audit_event(event)
        self._save_audit_log()
        del self.pending_approvals[event_id]

        return event

    def deny_event(self, event_id, denied_by="owner", reason="No reason given"):
        if event_id not in self.pending_approvals:
            raise ValueError("Event not found or already resolved")

        if event_id in self.timers:
            self.timers[event_id].cancel()
            del self.timers[event_id]

        event = self.pending_approvals[event_id]
        event["status"] = "DENIED"
        event["resolution"] = f"Denied by {denied_by}: {reason}"
        event["resolved"] = True
        event["resolved_at"] = datetime.now().isoformat()
        event["resolved_by"] = denied_by

        self._update_audit_event(event)
        self._save_audit_log()
        del self.pending_approvals[event_id]

        return event

    def get_pending_approvals(self):
        return [
            event
            for event in self.pending_approvals.values()
            if event.get("resolved") is False
        ]

    def get_audit_log(self, limit=50):
        return list(reversed(self.audit_log[-limit:]))

    def check_and_escalate(self, prediction_results, watchdog_results, llm_agent):
        newly_created = []

        for pond_id, prediction in prediction_results.items():
            urgency_score = prediction.get("urgency_score", 0)
            risk_level = prediction.get("risk_level", "SAFE")

            if urgency_score <= 40:
                continue

            has_pending = any(
                e.get("pond_id") == pond_id and e.get("resolved") is False
                for e in self.pending_approvals.values()
            )
            if has_pending:
                continue

            watchdog_result = watchdog_results.get(pond_id, {})
            llm_rec = llm_agent.get_recommendation(
                pond_id, prediction, watchdog_result
            )

            recommended_action = {
                "chemical": llm_rec.get("recommended_chemical", "none"),
                "dose_amount": llm_rec.get("dose_amount", 0),
                "dose_unit": llm_rec.get("dose_unit", "L"),
                "reason": llm_rec.get("reasoning", ""),
            }

            sensor_summary = {}
            for name, info in watchdog_result.get("sensors", {}).items():
                sensor_summary[name] = info.get("value")

            event = self.create_escalation_event(
                pond_id=pond_id,
                urgency_score=urgency_score,
                risk_level=risk_level,
                recommended_action=recommended_action,
                sensor_summary=sensor_summary,
                llm_reasoning=llm_rec.get("reasoning", ""),
            )
            if event:
                newly_created.append(event)

        return newly_created


escalation_engine = EscalationEngine()
