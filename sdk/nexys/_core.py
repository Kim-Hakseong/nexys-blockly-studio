"""Core: runtime config, backend selection, and TDMS session lifecycle."""
from __future__ import annotations

import atexit
from dataclasses import dataclass, field
from typing import Any, Optional

from . import tdms as _tdms


@dataclass
class Config:
    target: str = "sim"
    backend_name: str = "sim"
    device: str = "Dev1"
    # simulation pacing
    sim_realtime: bool = True   # honor delay/loop timing in wall-clock
    sim_ticks: int = 10         # how many iterations each loop_every runs in sim
    max_seconds: float = 30.0   # hard wall-clock guard for sim loops
    extra: dict = field(default_factory=dict)


_config = Config()
_backend: Optional[Any] = None
_tdms_session: Optional[_tdms.TdmsSession] = None


def _select_backend(target: str, backend: Optional[str], device: str):
    name = (backend or "").lower()
    tgt = (target or "").lower()
    is_ni = name in {"ni", "nidaqmx", "daqmx"} or tgt.startswith("ni")
    if is_ni:
        from .backends.ni import NIBackend
        return NIBackend(device=device)
    from .backends.sim import SimBackend
    return SimBackend()


def init(target: str = "sim", backend: Optional[str] = None,
         device: Optional[str] = None, **kwargs: Any) -> Config:
    """Initialize the runtime. Called once at the top of generated code.

    Examples (as emitted by the Studio):
        nexys.init(target="rpi-4b", agent="nexys-agent")
        nexys.init(target="ni-pxie", backend="nidaqmx", device="PXI1Slot2")
    Unknown kwargs (agent, gpio_backend, ...) are accepted and ignored so any
    generated banner runs unchanged.
    """
    global _backend, _config
    dev = device or kwargs.pop("device", None) or "Dev1"
    _config = Config(
        target=target or "sim",
        backend_name=(backend or ("ni" if (target or "").lower().startswith("ni") else "sim")),
        device=dev,
        sim_realtime=bool(kwargs.pop("sim_realtime", True)),
        sim_ticks=int(kwargs.pop("sim_ticks", 10)),
        max_seconds=float(kwargs.pop("max_seconds", 30.0)),
        extra=dict(kwargs),
    )
    _backend = _select_backend(_config.target, backend, dev)
    print(f"[nexys] init target={_config.target!r} backend={_backend.name!r} "
          f"device={dev!r}")
    return _config


def get_backend():
    global _backend
    if _backend is None:
        # generated code may call channels before init in odd edits — default to sim
        from .backends.sim import SimBackend
        _backend = SimBackend()
        print("[nexys] (auto) sim backend — init() was not called")
    return _backend


def config() -> Config:
    return _config


# -- TDMS lifecycle ---------------------------------------------------
def tdms_open(path: str = "nexys_run.tdms", **kwargs: Any) -> "_tdms.TdmsSession":
    """Open a real TDMS 2.0 file for log_tdms() output. Flushed at exit."""
    global _tdms_session
    _tdms_session = _tdms.TdmsSession(path)
    atexit.register(_flush_tdms)
    print(f"[nexys] TDMS stream open -> {path}")
    return _tdms_session


def tdms_session() -> Optional["_tdms.TdmsSession"]:
    return _tdms_session


def _flush_tdms() -> None:
    if _tdms_session is not None and not _tdms_session.closed:
        path = _tdms_session.close()
        n = sum(len(v) for v in _tdms_session._data.values())
        print(f"[nexys] TDMS flushed -> {path} "
              f"({len(_tdms_session._order)} channels, {n} samples)")


def tdms_close() -> Optional[str]:
    if _tdms_session is not None:
        return _tdms_session.close()
    return None
