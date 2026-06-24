"""Communication interfaces: UDP, TCP/IP, Serial.

    from nexys.interfaces import UdpTransport, TcpTransport, SerialTransport

Each transport exposes send/recv/close and a ``loopback()`` (or
``PtySerialLoopback``) constructor used by the self-test.
"""
from __future__ import annotations

from .base import Transport
from .tcp import TcpServer, TcpTransport
from .udp import UdpTransport
from .serial import PtySerialLoopback, SerialTransport

__all__ = [
    "Transport",
    "UdpTransport",
    "TcpTransport",
    "TcpServer",
    "SerialTransport",
    "PtySerialLoopback",
]
