"""Real network reception check — confirm values arrive over a live Ethernet
link from another PC or device.

Run a listener on one machine and a sender on another (connected by an Ethernet
cable / switch). The listener binds 0.0.0.0 so it accepts on the Ethernet
interface, prints every value it receives with the source IP, and tracks
packet count / rate / dropped-sequence loss.

    # on the receiving PC (prints its own IPs so you know where to point):
    python -m nexys.netcheck listen --proto udp --port 5005

    # on the other PC / device:
    python -m nexys.netcheck send --proto udp --host 192.168.0.10 --port 5005 \
        --count 100 --hz 10 --pattern sine

    python -m nexys.netcheck ips        # just list this host's IP addresses

Wire protocol (one ASCII line per sample, easy for any device to emit):
    NEXYS,<seq>,<unix_time>,<value>\n
Lines that don't match are still shown raw, so data from any device shows up.
"""
from __future__ import annotations

import argparse
import math
import socket
import sys
import time
from typing import Optional, Tuple

from .interfaces.tcp import TcpTransport
from .interfaces.udp import UdpTransport

PREFIX = "NEXYS"


# --------------------------------------------------------------------- helpers
def primary_ip() -> str:
    """Best-guess outbound IPv4 (no traffic actually sent)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def all_ipv4() -> list[str]:
    ips = {primary_ip()}
    try:
        ips.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass
    return sorted(i for i in ips if i)


def _encode(seq: int, value: float) -> bytes:
    return f"{PREFIX},{seq},{time.time():.6f},{value:.6f}\n".encode()


def _parse(data: bytes) -> Optional[Tuple[int, float, float]]:
    try:
        parts = data.decode(errors="replace").strip().split(",")
        if len(parts) == 4 and parts[0] == PREFIX:
            return int(parts[1]), float(parts[2]), float(parts[3])
    except (ValueError, IndexError):
        pass
    return None


def _pattern_value(pattern: str, i: int, n: int) -> float:
    if pattern == "ramp":
        return round(5.0 * i / max(1, n - 1), 4)
    if pattern == "count":
        return float(i)
    if pattern == "const":
        return 2.5
    # default: sine 2.5 +/- 2.0
    return round(2.5 + 2.0 * math.sin(2 * math.pi * i / 20.0), 4)


# --------------------------------------------------------------------- listen
def listen(proto: str, port: int, host: str = "0.0.0.0",
           count: int = 0, idle_timeout: float = 0.0) -> int:
    """Receive and print values until ``count`` packets (0 = forever)."""
    print(f"[nexys] listening {proto.upper()} on {host}:{port}")
    print(f"[nexys] this host's addresses: {', '.join(all_ipv4())}")
    print(f"[nexys] point the sender at one of the above, port {port}\n")

    received = 0
    last_seq: Optional[int] = None
    lost = 0
    t_start: Optional[float] = None
    vmin = float("inf")
    vmax = float("-inf")

    def handle(data: bytes, src) -> None:
        nonlocal received, last_seq, lost, t_start, vmin, vmax
        if t_start is None:
            t_start = time.monotonic()
        received += 1
        src_s = f"{src[0]}:{src[1]}" if src else "?"
        parsed = _parse(data)
        if parsed:
            seq, t_sent, value = parsed
            gap = ""
            if last_seq is not None and seq > last_seq + 1:
                missing = seq - last_seq - 1
                lost += missing
                gap = f"  ⚠ lost {missing}"
            last_seq = seq
            vmin, vmax = min(vmin, value), max(vmax, value)
            lat = (time.time() - t_sent) * 1000.0
            print(f"#{received:<5} from {src_s:<21} seq={seq:<6} "
                  f"value={value:<10.4f} ~{lat:6.1f} ms{gap}")
        else:
            print(f"#{received:<5} from {src_s:<21} raw={data[:48]!r}")

    try:
        if proto == "udp":
            srv = UdpTransport.server(port, host)
            while count == 0 or received < count:
                data, src = srv.recvfrom(timeout=idle_timeout or 1.0)
                if not data:
                    if idle_timeout and t_start is not None:
                        print("[nexys] idle timeout — stopping")
                        break
                    continue
                handle(data, src)
            srv.close()
        else:  # tcp
            server = TcpTransport.server(port, host)
            print("[nexys] waiting for a TCP connection…")
            conn, addr = server.accept()
            print(f"[nexys] connected: {addr[0]}:{addr[1]}\n")
            buf = b""
            while count == 0 or received < count:
                chunk = conn.recv(4096, timeout=idle_timeout or 1.0)
                if not chunk:
                    if idle_timeout:
                        print("[nexys] connection idle/closed — stopping")
                        break
                    continue
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    handle(line + b"\n", addr)
            conn.close()
            server.close()
    except KeyboardInterrupt:
        print("\n[nexys] stopped by user")

    dur = (time.monotonic() - t_start) if t_start else 0.0
    rate = received / dur if dur > 0 else 0.0
    print(f"\n[nexys] received {received} packets in {dur:.2f}s "
          f"({rate:.1f}/s), lost {lost}"
          + (f", value range [{vmin:.3f}, {vmax:.3f}]" if received and vmin != float("inf") else ""))
    return 0 if received > 0 else 2


# --------------------------------------------------------------------- send
def send(proto: str, host: str, port: int, count: int = 100, hz: float = 10.0,
         pattern: str = "sine") -> int:
    period = 1.0 / hz if hz > 0 else 0.0
    print(f"[nexys] sending {count} {pattern} values to {proto.upper()} "
          f"{host}:{port} at {hz} Hz")
    sent = 0
    if proto == "udp":
        tx = UdpTransport(host=host, port=port)
        for i in range(count):
            tx.send(_encode(i, _pattern_value(pattern, i, count)))
            sent += 1
            if period:
                time.sleep(period)
        tx.close()
    else:
        tx = TcpTransport.connect(host, port)
        for i in range(count):
            tx.send(_encode(i, _pattern_value(pattern, i, count)))
            sent += 1
            if period:
                time.sleep(period)
        tx.close()
    print(f"[nexys] sent {sent} packets")
    return 0


# --------------------------------------------------------------------- CLI
def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="nexys-netcheck",
                                description="Verify values arrive over a real network link.")
    sub = p.add_subparsers(dest="cmd", required=True)

    pl = sub.add_parser("listen", help="bind and receive values")
    pl.add_argument("--proto", choices=["udp", "tcp"], default="udp")
    pl.add_argument("--port", type=int, default=5005)
    pl.add_argument("--host", default="0.0.0.0", help="bind address (0.0.0.0 = all interfaces)")
    pl.add_argument("--count", type=int, default=0, help="stop after N packets (0 = forever)")
    pl.add_argument("--idle-timeout", type=float, default=0.0,
                    help="stop after this many seconds with no data (0 = never)")

    ps = sub.add_parser("send", help="send values to a listener")
    ps.add_argument("--proto", choices=["udp", "tcp"], default="udp")
    ps.add_argument("--host", required=True, help="listener IP address")
    ps.add_argument("--port", type=int, default=5005)
    ps.add_argument("--count", type=int, default=100)
    ps.add_argument("--hz", type=float, default=10.0)
    ps.add_argument("--pattern", choices=["sine", "ramp", "count", "const"], default="sine")

    sub.add_parser("ips", help="print this host's IPv4 addresses")

    args = p.parse_args(argv)
    if args.cmd == "listen":
        return listen(args.proto, args.port, args.host, args.count, args.idle_timeout)
    if args.cmd == "send":
        return send(args.proto, args.host, args.port, args.count, args.hz, args.pattern)
    if args.cmd == "ips":
        print("\n".join(all_ipv4()))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
