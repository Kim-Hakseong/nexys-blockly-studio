"""Channel I/O facade — delegates to the active backend.

Generated code calls these as ``nexys.channels.ai_read('AI0')`` etc.
"""
from __future__ import annotations

from . import _core


def ai_read(channel: str) -> float:
    """Read an analog input channel (volts)."""
    return _core.get_backend().ai_read(channel)


def ao_write(channel: str, value: float) -> None:
    """Write an analog output channel (volts)."""
    _core.get_backend().ao_write(channel, value)


def di_read(channel: str) -> bool:
    """Read a digital input line (True = HIGH)."""
    return _core.get_backend().di_read(channel)


def do_write(channel: str, level: str) -> None:
    """Write a digital output line ('HIGH' / 'LOW')."""
    _core.get_backend().do_write(channel, level)


def sensor_read(kind: str, channel: int = 0) -> float:
    """Read an integrated sensor (thermocouple / pressure / strain / accel)."""
    return _core.get_backend().sensor_read(kind, channel)
