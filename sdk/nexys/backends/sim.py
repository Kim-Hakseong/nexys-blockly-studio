"""Simulation backend — runs anywhere, no hardware.

Mirrors the in-browser JS simulator: AI/sensor channels return time-varying
synthetic signals; AO/DO writes are recorded and echoed. Deterministic enough
to read like real instrument data, with light noise for realism.
"""
from __future__ import annotations

import math
import random
import time

from .base import parse_channel


class SimBackend:
    name = "sim"

    def __init__(self, seed: int = 1234) -> None:
        self._t0 = time.monotonic()
        self._rng = random.Random(seed)
        self.ao = [0.0, 0.0, 0.0, 0.0]
        self.do = [False] * 8
        # switches/buttons a user could "press" in a richer sim; default low
        self.di = [False] * 8

    def _elapsed(self) -> float:
        return time.monotonic() - self._t0

    def ai_read(self, ch: str) -> float:
        _kind, i = parse_channel(ch)
        t = self._elapsed()
        # channel-specific sine around 2.5 V + small noise (0..5 V range)
        base = 2.5 + 1.2 * math.sin(2 * math.pi * (0.4 + 0.1 * i) * t + i)
        return round(base + self._rng.uniform(-0.03, 0.03), 4)

    def ao_write(self, ch: str, value: float) -> None:
        _kind, i = parse_channel(ch)
        if 0 <= i < len(self.ao):
            self.ao[i] = float(value)

    def di_read(self, ch: str) -> bool:
        _kind, i = parse_channel(ch)
        return bool(self.di[i]) if 0 <= i < len(self.di) else False

    def do_write(self, ch: str, level: str) -> None:
        _kind, i = parse_channel(ch)
        if 0 <= i < len(self.do):
            self.do[i] = (str(level).upper() == "HIGH")

    def sensor_read(self, kind: str, ch: int) -> float:
        t = self._elapsed()
        n = self._rng.uniform
        if kind == "thermocouple":
            return round(23.0 + 2.0 * math.sin(0.2 * t) + n(-0.1, 0.1), 3)
        if kind == "pressure":
            return round(101.3 + 5.0 * math.sin(0.5 * t) + n(-0.2, 0.2), 3)
        if kind == "strain":
            return round(120.0 + 40.0 * math.sin(1.0 * t) + n(-1, 1), 2)
        if kind == "accel":
            return round(9.81 + 3.0 * math.sin(2 * math.pi * 5 * t) + n(-0.2, 0.2), 3)
        return round(n(0, 1), 4)

    def close(self) -> None:
        pass
