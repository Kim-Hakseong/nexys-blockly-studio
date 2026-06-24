"""Built-In Test (BIT) self-verification.

Runs a set of checks that need no external peer:
  * interface loopback — UDP, TCP, Serial: send a known pattern, read it back,
    verify byte-for-byte and measure round-trip latency.
  * channel BIT — drive a DO line and confirm an AI reading is in range, via the
    active backend (sim or NI).

    import nexys
    nexys.init(target="sim")
    report = nexys.selftest.run()
    print(report.summary())
    assert report.passed
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List, Sequence

from . import _core
from .interfaces.tcp import TcpTransport
from .interfaces.udp import UdpTransport
from .interfaces import serial as _serial

DEFAULT_PAYLOAD = b"NEXYS-BIT-0123456789-\x00\xff\xa5"


@dataclass
class Check:
    name: str
    passed: bool
    detail: str = ""
    latency_ms: float = 0.0


@dataclass
class SelfTestReport:
    checks: List[Check] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return bool(self.checks) and all(c.passed for c in self.checks)

    def add(self, name: str, passed: bool, detail: str = "", latency_ms: float = 0.0) -> Check:
        c = Check(name, passed, detail, latency_ms)
        self.checks.append(c)
        return c

    def summary(self) -> str:
        lines = ["nexys BIT self-test"]
        for c in self.checks:
            tag = "PASS" if c.passed else "FAIL"
            lat = f"  {c.latency_ms:6.2f} ms" if c.latency_ms else ""
            lines.append(f"  [{tag}] {c.name:<22} {c.detail}{lat}")
        n_ok = sum(1 for c in self.checks if c.passed)
        lines.append(f"  --> {n_ok}/{len(self.checks)} checks passed "
                     f"({'PASS' if self.passed else 'FAIL'})")
        return "\n".join(lines)


def _loopback_check(report: SelfTestReport, name: str, transport, payload: bytes) -> None:
    try:
        t0 = time.perf_counter()
        transport.send(payload)
        got = transport.recv(len(payload) + 16, timeout=2.0)
        dt = (time.perf_counter() - t0) * 1000.0
        ok = got[:len(payload)] == payload
        report.add(name, ok, f"sent {len(payload)}B, recv {len(got)}B", dt)
    except Exception as exc:  # noqa: BLE001 - report, don't crash the BIT
        report.add(name, False, f"error: {exc}")
    finally:
        try:
            transport.close()
        except Exception:
            pass


def run(interfaces: Sequence[str] = ("udp", "tcp", "serial"),
        channels: bool = True,
        payload: bytes = DEFAULT_PAYLOAD) -> SelfTestReport:
    """Execute the BIT and return a report (does not raise on failure)."""
    report = SelfTestReport()

    if "udp" in interfaces:
        _loopback_check(report, "udp.loopback", UdpTransport.loopback(), payload)
    if "tcp" in interfaces:
        _loopback_check(report, "tcp.loopback", TcpTransport.loopback(), payload)
    if "serial" in interfaces:
        try:
            link = _serial.PtySerialLoopback()
            _loopback_check(report, "serial.loopback", link, payload)
        except (ImportError, OSError, AttributeError) as exc:
            report.add("serial.loopback", False, f"unavailable: {exc}")

    if channels:
        try:
            be = _core.get_backend()
            be.do_write("DO0", "HIGH")
            v = be.ai_read("AI0")
            report.add("channel.ai0_range", 0.0 <= float(v) <= 10.0,
                       f"AI0={float(v):.3f} V on {be.name}")
        except Exception as exc:  # noqa: BLE001
            report.add("channel.ai0_range", False, f"error: {exc}")

    return report
