"""Output sinks — TDMS logging, MQTT publish, alarms, BIT verdicts.

Generated code calls ``nexys.output.log_tdms('ch', v)``,
``nexys.output.mqtt_publish('topic', payload)``,
``nexys.output.alarm('channel', 'message')``,
``nexys.output.bit_result('PASS'|'FAIL', value=...)``.
"""
from __future__ import annotations

from typing import Any

from . import _core

# simple run-wide counters, handy for demos / assertions
counters = {"tdms_samples": 0, "alarms": 0, "bit_pass": 0, "bit_fail": 0, "mqtt": 0}


def log_tdms(channel: str, value: float) -> None:
    """Append a sample to the open TDMS file (real .tdms 2.0 at exit)."""
    session = _core.tdms_session()
    if session is None:
        # auto-open a default file so data is never silently dropped
        session = _core.tdms_open("nexys_run.tdms")
    session.log(channel, value)
    counters["tdms_samples"] += 1
    print(f"[nexys] TDMS:{channel} = {float(value):.4f}")


def mqtt_publish(topic: str, payload: Any) -> None:
    """Publish to MQTT. Sim prints; real backend would use paho-mqtt."""
    counters["mqtt"] += 1
    print(f"[nexys] MQTT {topic} <- {payload}")


def alarm(channel: str, message: str) -> None:
    """Raise an alarm on email / slack / buzzer."""
    counters["alarms"] += 1
    print(f"[nexys] ALARM[{channel}] {message}")


def bit_result(verdict: str, value: float = 0.0) -> None:
    """Record a Built-In-Test PASS/FAIL verdict."""
    if str(verdict).upper() == "PASS":
        counters["bit_pass"] += 1
    else:
        counters["bit_fail"] += 1
    print(f"[nexys] BIT {verdict} (value={float(value):.4f})")
