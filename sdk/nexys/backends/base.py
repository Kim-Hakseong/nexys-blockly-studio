"""Hardware backend interface. Concrete backends: sim, ni."""
from __future__ import annotations

from typing import Protocol


def parse_channel(ch: str):
    """'AI3' -> ('AI', 3)."""
    kind = ch.rstrip("0123456789")
    idx = ch[len(kind):]
    return kind, int(idx) if idx else 0


class Backend(Protocol):
    name: str

    def ai_read(self, ch: str) -> float: ...
    def ao_write(self, ch: str, value: float) -> None: ...
    def di_read(self, ch: str) -> bool: ...
    def do_write(self, ch: str, level: str) -> None: ...
    def sensor_read(self, kind: str, ch: int) -> float: ...
    def close(self) -> None: ...
