"""Timing primitives — loop scheduling, delays, condition waits.

Generated code calls ``nexys.timing.loop_every(50, loop_0)`` etc.

In the sim backend a ``loop_every`` runs its callback a bounded number of times
(``config.sim_ticks``) so ``python generated.py`` terminates instead of spinning
forever. On real hardware backends it runs until interrupted or the wall-clock
guard (``config.max_seconds``) trips.
"""
from __future__ import annotations

import time
from typing import Callable

from . import _core


def loop_every(interval_ms: float, fn: Callable[[], object]) -> None:
    """Invoke ``fn`` every ``interval_ms`` milliseconds."""
    cfg = _core.config()
    period = interval_ms / 1000.0
    start = time.monotonic()
    is_sim = _core.get_backend().name == "sim"
    tick = 0
    try:
        while True:
            t_iter = time.monotonic()
            fn()
            tick += 1
            if is_sim and tick >= cfg.sim_ticks:
                break
            if (time.monotonic() - start) >= cfg.max_seconds:
                print(f"[nexys] loop_every: max_seconds={cfg.max_seconds}s guard reached")
                break
            if cfg.sim_realtime or not is_sim:
                sleep = period - (time.monotonic() - t_iter)
                if sleep > 0:
                    time.sleep(sleep)
    except KeyboardInterrupt:
        print("[nexys] loop_every: interrupted")


def delay_ms(ms: float) -> None:
    """Block for ``ms`` milliseconds (skipped in non-realtime sim)."""
    cfg = _core.config()
    if not cfg.sim_realtime and _core.get_backend().name == "sim":
        return
    time.sleep(ms / 1000.0)


def wait_until(predicate: Callable[[], bool], poll_ms: float = 10.0) -> None:
    """Poll ``predicate`` until it returns True (bounded by max_seconds)."""
    cfg = _core.config()
    start = time.monotonic()
    while not predicate():
        if (time.monotonic() - start) >= cfg.max_seconds:
            print("[nexys] wait_until: max_seconds guard reached")
            return
        time.sleep(poll_ms / 1000.0)
