"""UDP datagram transport."""
from __future__ import annotations

import socket
from typing import Optional, Tuple


class UdpTransport:
    name = "udp"

    def __init__(self, host: str = "127.0.0.1", port: int = 0,
                 bind: Optional[Tuple[str, int]] = None) -> None:
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        if bind is not None:
            self.sock.bind(bind)
        self.peer: Tuple[str, int] = (host, port)

    @classmethod
    def loopback(cls) -> "UdpTransport":
        """A socket bound to an ephemeral port whose peer is itself."""
        t = cls(bind=("127.0.0.1", 0))
        t.peer = t.sock.getsockname()
        return t

    @classmethod
    def server(cls, port: int, host: str = "0.0.0.0") -> "UdpTransport":
        """Bind to a real interface to receive datagrams from the network.

        host '0.0.0.0' accepts on every interface (incl. the Ethernet port).
        """
        return cls(bind=(host, port))

    def recvfrom(self, bufsize: int = 65535, timeout: float = 1.0):
        """Receive a datagram, returning (data, (src_ip, src_port))."""
        self.sock.settimeout(timeout)
        try:
            return self.sock.recvfrom(bufsize)
        except socket.timeout:
            return b"", None

    def send(self, data: bytes) -> int:
        return self.sock.sendto(bytes(data), self.peer)

    def recv(self, bufsize: int = 4096, timeout: float = 1.0) -> bytes:
        self.sock.settimeout(timeout)
        try:
            data, _addr = self.sock.recvfrom(bufsize)
        except socket.timeout:
            return b""
        return data

    def close(self) -> None:
        try:
            self.sock.close()
        except OSError:
            pass
