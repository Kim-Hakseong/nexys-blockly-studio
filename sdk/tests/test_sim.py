"""End-to-end test of the sim backend + facades, no hardware."""
import nexys
from nexys.backends.sim import SimBackend


def test_init_sim_backend():
    cfg = nexys.init(target="sim", sim_realtime=False, sim_ticks=5)
    assert cfg.backend_name == "sim"
    assert isinstance(nexys.get_backend(), SimBackend)


def test_channels_roundtrip():
    nexys.init(target="sim", sim_realtime=False)
    nexys.channels.do_write("DO3", "HIGH")
    assert nexys.get_backend().do[3] is True
    nexys.channels.do_write("DO3", "LOW")
    assert nexys.get_backend().do[3] is False
    nexys.channels.ao_write("AO1", 3.3)
    assert abs(nexys.get_backend().ao[1] - 3.3) < 1e-9
    v = nexys.channels.ai_read("AI0")
    assert 0.0 <= v <= 5.0


def test_signal_math():
    assert nexys.signal.scale_linear(2.0, 3.0, 1.0) == 7.0
    assert nexys.signal.in_range(2.5, 1.5, 3.5) is True
    assert nexys.signal.in_range(9.0, 1.5, 3.5) is False
    # rms of constant 3.0 -> 3.0
    r = 0.0
    for _ in range(50):
        r = nexys.signal.rms(3.0, samples=10, key=99)
    assert abs(r - 3.0) < 1e-6


def test_loop_runs_bounded():
    nexys.init(target="sim", sim_realtime=False, sim_ticks=4)
    nexys.output.counters["bit_pass"] = 0
    nexys.output.counters["bit_fail"] = 0

    def body():
        nexys.output.bit_result("PASS", 2.0)

    nexys.timing.loop_every(10, body)
    assert nexys.output.counters["bit_pass"] == 4


def test_full_generated_program(tmp_path):
    """Simulate exactly what generated code does, end to end."""
    out = tmp_path / "run.tdms"
    nexys.init(target="sim", sim_realtime=False, sim_ticks=6)
    nexys.tdms_open(str(out))

    def loop_0():
        nexys.channels.do_write("DO0", "HIGH")
        resp = nexys.channels.ai_read("AI0")
        nexys.channels.do_write("DO0", "LOW")
        nexys.output.log_tdms("bit_ai0", resp)

    nexys.timing.loop_every(50, loop_0)
    path = nexys.tdms_close()
    assert out.exists()
    assert out.stat().st_size > 0
    # 6 ticks -> 6 samples logged
    assert len(nexys.tdms_session()._data["bit_ai0"]) == 6
