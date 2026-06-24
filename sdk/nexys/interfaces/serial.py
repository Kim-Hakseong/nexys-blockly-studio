"""Serial (UART/RS-232/RS-485) transport.

Real ports use pyserial (``pip install nexys-sdk[serial]``). For self-test and
CI there is a dependency-free pseudo-terminal loopback (``PtySerialLoopback``)
that exercises the same send/recv contract over a real serial-style channel.
"""
from __future__ import annotations

import os
import select


class SerialTransport:
    name = "serial"

    def __init__(self, ser) -> None:
        self._ser = ser  # pyserial Serial instance

    @classmethod
    def open(cls, port: str, baudrate: int = 115200, timeout: float = 1.0) -> "SerialTransport":
        try:
            import serial  # pyserial
        except ImportError as exc:  # pragma: no cover - env dependent
            raise ImportError(
                "Serial port access needs pyserial: pip install nexys-sdk[serial]"
            ) from exc
        return cls(serial.Serial(port, baudrate=baudrate, timeout=timeout))

    def send(self, data: bytes) -> int:
        return int(self._ser.write(bytes(data)))

    def recv(self, bufsize: int = 4096, timeout: float = 1.0) -> bytes:
        self._ser.timeout = timeout
        return bytes(self._ser.read(bufsize))

    def close(self) -> None:
        try:
            self._ser.close()
        except Exception:
            pass


class PtySerialLoopback:
    """A stdlib-only serial-style loopback backed by a pseudo-terminal pair.

    Bytes written via ``send`` traverse the kernel pty (raw mode, no line
    discipline) and are read back via ``recv`` — verifying link integrity with
    no hardware and no third-party dependency.
    """
    name = "serial"

    def __init__(self) -> None:
        import tty  # POSIX only
        self._m, self._s = os.openpty()
        for fd in (self._m, self._s):
            tty.setraw(fd)

    def send(self, data: bytes) -> int:
        return os.write(self._m, bytes(data))

    def recv(self, bufsize: int = 4096, timeout: float = 1.0) -> bytes:
        out = b""
        first = True
        while len(out) < bufsize:
            r, _, _ = select.select([self._s], [], [], timeout if first else 0.05)
            first = False
            if not r:
                break
            chunk = os.read(self._s, bufsize - len(out))
            if not chunk:
                break
            out += chunk
        return out

    def close(self) -> None:
        for fd in (getattr(self, "_m", None), getattr(self, "_s", None)):
            if fd is not None:
                try:
                    os.close(fd)
                except OSError:
                    pass
