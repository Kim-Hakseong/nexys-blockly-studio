"""Signal processing — scaling, RMS, low-pass filter, range check.

Generated code calls ``nexys.signal.scale_linear(x, a, b)``,
``nexys.signal.rms(x, samples=N)``, ``nexys.signal.lpf(x, cutoff_hz=hz)``,
``nexys.signal.in_range(x, lo, hi)``.

``rms`` and ``lpf`` are stateful: blocks feed one instantaneous sample per call,
so the SDK keeps a small rolling history / IIR state per call-site (identified
by argument shape). This matches the in-browser simulator's behaviour.
"""
from __future__ import annotations

import math
from collections import deque
from typing import Deque, Dict, Tuple


def scale_linear(x: float, a: float = 1.0, b: float = 0.0) -> float:
    """y = a*x + b."""
    return a * x + b


_rms_buffers: "Dict[int, Deque[float]]" = {}


def rms(x: float, samples: int = 100, key: int = 0) -> float:
    """Root-mean-square over the last ``samples`` values fed to this call-site."""
    buf = _rms_buffers.get(key)
    if buf is None or buf.maxlen != samples:
        buf = deque(buf or (), maxlen=samples)
        _rms_buffers[key] = buf
    buf.append(float(x))
    if not buf:
        return 0.0
    return math.sqrt(sum(v * v for v in buf) / len(buf))


_lpf_state: "Dict[int, float]" = {}
_lpf_last_t: "Dict[int, float]" = {}


def lpf(x: float, cutoff_hz: float = 50.0, dt: float = 0.01, key: int = 0) -> float:
    """First-order low-pass (exponential) filter, stateful per call-site."""
    rc = 1.0 / (2 * math.pi * cutoff_hz) if cutoff_hz > 0 else 0.0
    alpha = dt / (rc + dt) if (rc + dt) > 0 else 1.0
    prev = _lpf_state.get(key, float(x))
    y = prev + alpha * (float(x) - prev)
    _lpf_state[key] = y
    return y


def in_range(value: float, low: float, high: float) -> bool:
    """True if low <= value <= high."""
    return low <= value <= high


# alias used by some generated variants
threshold_check = in_range
