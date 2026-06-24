"""Exercise the real server/sender path (over the loopback interface).

These run the same code that carries data across a physical Ethernet link —
here both ends are on this host, but the sockets bind 0.0.0.0 and traverse the
real network stack, so the path is identical to two PCs on a cable.
"""
import threading
import time

from nexys import netcheck
from nexys.interfaces import TcpTransport, UdpTransport


def test_udp_server_receives_from_client():
    srv = UdpTransport.server(0)  # ephemeral port, bound on all interfaces
    port = srv.sock.getsockname()[1]
    tx = UdpTransport(host="127.0.0.1", port=port)
    try:
        tx.send(b"NEXYS,1,123.0,2.5\n")
        data, src = srv.recvfrom(timeout=2.0)
        assert data.startswith(b"NEXYS,1")
        assert src is not None and src[0]
    finally:
        tx.close()
        srv.close()


def test_tcp_server_accepts_and_receives():
    server = TcpTransport.server(0)
    port = server.address[1]

    def client():
        c = TcpTransport.connect("127.0.0.1", port)
        c.send(b"hello-ethernet\n")
        time.sleep(0.1)
        c.close()

    th = threading.Thread(target=client, daemon=True)
    th.start()
    conn, addr = server.accept(timeout=2.0)
    try:
        data = conn.recv(32, timeout=2.0)
        assert data.startswith(b"hello-ethernet")
        assert addr[0]
    finally:
        conn.close()
        server.close()
        th.join(timeout=2.0)


def test_protocol_roundtrip():
    line = netcheck._encode(7, 3.25)
    seq, _t, value = netcheck._parse(line)
    assert seq == 7
    assert abs(value - 3.25) < 1e-9
    assert netcheck._parse(b"garbage data") is None


def test_send_reaches_server():
    srv = UdpTransport.server(0)
    port = srv.sock.getsockname()[1]
    th = threading.Thread(
        target=netcheck.send, args=("udp", "127.0.0.1", port, 5, 0.0, "ramp"),
        daemon=True)
    th.start()
    got = 0
    for _ in range(5):
        data, _src = srv.recvfrom(timeout=2.0)
        if data:
            got += 1
    th.join(timeout=2.0)
    srv.close()
    assert got == 5


def test_local_ips_present():
    ips = netcheck.all_ipv4()
    assert ips  # at least one address (loopback or real)
