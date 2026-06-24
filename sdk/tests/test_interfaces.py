"""Real loopback tests for the comms interfaces + the BIT self-test."""
import sys

import pytest

import nexys
from nexys.interfaces import TcpTransport, UdpTransport
from nexys.interfaces.serial import PtySerialLoopback

PAYLOAD = b"NEXYS-BIT-\x00\x01\x02\xfe\xff-roundtrip"


def test_udp_loopback():
    t = UdpTransport.loopback()
    try:
        t.send(PAYLOAD)
        assert t.recv(len(PAYLOAD) + 8, timeout=2.0) == PAYLOAD
    finally:
        t.close()


def test_tcp_loopback():
    t = TcpTransport.loopback()
    try:
        t.send(PAYLOAD)
        assert t.recv(len(PAYLOAD), timeout=2.0) == PAYLOAD
    finally:
        t.close()


@pytest.mark.skipif(not sys.platform.startswith(("linux", "darwin")),
                    reason="pty loopback is POSIX-only")
def test_serial_pty_loopback():
    t = PtySerialLoopback()
    try:
        t.send(PAYLOAD)
        assert t.recv(len(PAYLOAD), timeout=2.0) == PAYLOAD
    finally:
        t.close()


def test_selftest_all_pass():
    nexys.init(target="sim", sim_realtime=False)
    report = nexys.selftest.run()
    assert report.passed, report.summary()
    names = {c.name for c in report.checks}
    assert {"udp.loopback", "tcp.loopback", "serial.loopback",
            "channel.ai0_range"} <= names


def test_selftest_subset():
    nexys.init(target="sim", sim_realtime=False)
    report = nexys.selftest.run(interfaces=("udp",), channels=False)
    assert len(report.checks) == 1
    assert report.checks[0].name == "udp.loopback"
    assert report.passed
