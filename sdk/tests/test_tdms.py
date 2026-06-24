"""Validate the pure-stdlib TDMS writer.

Structural asserts always run. If npTDMS is installed (pip install nexys-sdk[dev])
a full round-trip check runs too.
"""
import struct

import pytest

from nexys.tdms import build_tdms, TdmsSession


def test_lead_in_and_structure():
    data = build_tdms([("ai0", [0.0, 1.5, -2.5], {"unit_string": "V"})], group="G")
    assert data[:4] == b"TDSm"
    toc = struct.unpack_from("<I", data, 4)[0]
    assert toc == (0x02 | 0x04 | 0x08)
    version = struct.unpack_from("<I", data, 8)[0]
    assert version == 4713
    next_off = struct.unpack_from("<Q", data, 12)[0]
    raw_off = struct.unpack_from("<Q", data, 20)[0]
    # 3 doubles of raw data after metadata
    assert next_off - raw_off == 3 * 8


def test_session_accumulate(tmp_path):
    s = TdmsSession(str(tmp_path / "x.tdms"))
    for v in [1.0, 2.0, 3.0]:
        s.log("ch_a", v)
    s.log("ch_b", 9.0)
    path = s.close()
    assert (tmp_path / "x.tdms").exists()
    assert s._data["ch_a"] == [1.0, 2.0, 3.0]


@pytest.mark.skipif(
    pytest.importorskip("nptdms", reason="npTDMS not installed") is None,
    reason="npTDMS not installed",
)
def test_roundtrip_with_nptdms(tmp_path):
    from nptdms import TdmsFile

    p = tmp_path / "rt.tdms"
    payload = build_tdms(
        [
            ("ai0_volts", [0.0, 1.25, -2.5, 3.14159], {"unit_string": "V"}),
            ("temp_c", [22.5, 23.1, 23.9], {}),
            ("empty", [], {}),
        ],
        group="Nexys Run",
        file_props={"producer": "nexys-sdk"},
    )
    p.write_bytes(payload)

    f = TdmsFile.read(str(p))
    assert f.properties["producer"] == "nexys-sdk"
    g = f["Nexys Run"]
    assert list(g["ai0_volts"][:]) == [0.0, 1.25, -2.5, 3.14159]
    assert g["ai0_volts"].properties["unit_string"] == "V"
    assert list(g["temp_c"][:]) == [22.5, 23.1, 23.9]
    assert len(g["empty"]) == 0
