"""Common transport interface for the comms layer (UDP / TCP / Serial).

A Transport is a byte pipe: ``send(bytes)`` then ``recv()``. Each transport
also offers a ``loopback()`` constructor that wires it back to itself, which is
what the self-test (BIT) uses to verify link integrity with no peer hardware.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class Transport(Protocol):
    name: str

    def send(self, data: bytes) -> int: ...
    def recv(self, bufsize: int = 4096, timeout: float = 1.0) -> bytes: ...
    def close(self) -> None: ...
