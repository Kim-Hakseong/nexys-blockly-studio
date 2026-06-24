"""NI backend — real National Instruments hardware via NI-DAQmx (nidaqmx).

Maps Nexys logical channels to NI-DAQmx physical channels (same scheme as the
Studio pin map):
    AI{n} -> {device}/ai{n}
    AO{n} -> {device}/ao{n}
    DI{n} -> {device}/port0/line{n}
    DO{n} -> {device}/port1/line{n}

Requires ``nidaqmx`` and the NI-DAQmx runtime + actual NI hardware
(PXIe / cRIO / cDAQ). Install with: ``pip install nexys-sdk[ni]``.

Tasks are created lazily and cached per channel. This module imports cleanly
even without nidaqmx installed — the ImportError is raised only when an NI
backend is actually selected at init().
"""
from __future__ import annotations

from typing import Dict

from .base import parse_channel

try:
    import nidaqmx  # type: ignore
    from nidaqmx.constants import LineGrouping  # type: ignore
    _HAVE_NIDAQMX = True
except Exception:  # pragma: no cover - depends on environment
    nidaqmx = None  # type: ignore
    LineGrouping = None  # type: ignore
    _HAVE_NIDAQMX = False


class NIBackend:
    name = "ni"

    def __init__(self, device: str = "Dev1") -> None:
        if not _HAVE_NIDAQMX:
            raise ImportError(
                "NI backend requires the 'nidaqmx' package and the NI-DAQmx "
                "runtime. Install with: pip install nexys-sdk[ni]"
            )
        self.device = device
        self._tasks: Dict[str, "nidaqmx.Task"] = {}

    # -- physical channel strings -------------------------------------
    def _phys(self, ch: str) -> str:
        kind, i = parse_channel(ch)
        if kind == "AI":
            return f"{self.device}/ai{i}"
        if kind == "AO":
            return f"{self.device}/ao{i}"
        if kind == "DI":
            return f"{self.device}/port0/line{i}"
        if kind == "DO":
            return f"{self.device}/port1/line{i}"
        raise ValueError(f"unknown channel {ch!r}")

    def _task(self, key: str, builder) -> "nidaqmx.Task":
        task = self._tasks.get(key)
        if task is None:
            task = nidaqmx.Task()
            builder(task)
            self._tasks[key] = task
        return task

    # -- channel ops --------------------------------------------------
    def ai_read(self, ch: str) -> float:
        phys = self._phys(ch)
        task = self._task("ai:" + phys,
                          lambda t: t.ai_channels.add_ai_voltage_chan(phys))
        return float(task.read())

    def ao_write(self, ch: str, value: float) -> None:
        phys = self._phys(ch)
        task = self._task("ao:" + phys,
                          lambda t: t.ao_channels.add_ao_voltage_chan(phys))
        task.write(float(value), auto_start=True)

    def di_read(self, ch: str) -> bool:
        phys = self._phys(ch)
        task = self._task("di:" + phys,
                          lambda t: t.di_channels.add_di_chan(
                              phys, line_grouping=LineGrouping.CHAN_PER_LINE))
        return bool(task.read())

    def do_write(self, ch: str, level: str) -> None:
        phys = self._phys(ch)
        task = self._task("do:" + phys,
                          lambda t: t.do_channels.add_do_chan(
                              phys, line_grouping=LineGrouping.CHAN_PER_LINE))
        task.write(str(level).upper() == "HIGH", auto_start=True)

    def sensor_read(self, kind: str, ch: int) -> float:
        phys = f"{self.device}/ai{ch}"
        if kind == "thermocouple":
            task = self._task(
                f"tc:{phys}",
                lambda t: t.ai_channels.add_ai_thrmcpl_chan(phys))
        else:
            task = self._task(
                f"sensor:{phys}",
                lambda t: t.ai_channels.add_ai_voltage_chan(phys))
        return float(task.read())

    def close(self) -> None:
        for task in self._tasks.values():
            try:
                task.close()
            except Exception:
                pass
        self._tasks.clear()
