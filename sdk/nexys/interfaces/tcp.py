"""TCP/IP stream transport."""
from __future__ import annotations

import socket
import threading


class TcpTransport:
    name = "tcp"

    def __init__(self, sock: socket.socket) -> None:
        self.sock = sock
        self._server: socket.socket | None = None
        self._thread: threading.Thread | None = None

    @classmethod
    def connect(cls, host: str, port: int, timeout: float = 2.0) -> "TcpTransport":
        return cls(socket.create_connection((host, port), timeout=timeout))

    @classmethod
    def loopback(cls) -> "TcpTransport":
        """Spin up a tiny echo server on localhost and connect to it."""
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        host, port = server.getsockname()

        def _echo() -> None:
            try:
                conn, _ = server.accept()
                with conn:
                    while True:
                        data = conn.recv(4096)
                        if not data:
                            break
                        conn.sendall(data)
            except OSError:
                pass

        th = threading.Thread(target=_echo, daemon=True)
        th.start()
        client = socket.create_connection((host, port), timeout=2.0)
        t = cls(client)
        t._server = server
        t._thread = th
        return t

    def send(self, data: bytes) -> int:
        self.sock.sendall(bytes(data))
        return len(data)

    def recv(self, bufsize: int = 4096, timeout: float = 1.0) -> bytes:
        self.sock.settimeout(timeout)
        out = b""
        try:
            while len(out) < bufsize:
                chunk = self.sock.recv(bufsize - len(out))
                if not chunk:
                    break
                out += chunk
                self.sock.settimeout(0.05)  # drain quickly after first chunk
        except socket.timeout:
            pass
        return out

    def close(self) -> None:
        for s in (self.sock, self._server):
            if s is not None:
                try:
                    s.close()
                except OSError:
                    pass
