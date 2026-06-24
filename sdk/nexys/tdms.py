"""Pure-stdlib TDMS 2.0 binary writer + a per-run accumulator.

Mirrors the TypeScript writer in ``lib/tdms/writer.ts`` byte-for-byte, so files
produced here are identical in structure and open in LabVIEW / DIAdem / npTDMS.

No third-party dependency — only ``struct`` from the standard library.
"""
from __future__ import annotations

import math
import struct
from typing import Dict, List, Mapping, Sequence, Tuple, Union

_TAG = b"TDSm"
_VERSION = 4713
# ToC = kTocMetaData(0x02) | kTocNewObjList(0x04) | kTocRawData(0x08)
_TOC = 0x02 | 0x04 | 0x08
_T_I32 = 3
_T_DOUBLE = 10  # 0x0A
_T_STRING = 0x20

PropValue = Union[str, int, float]


def _u32(n: int) -> bytes:
    return struct.pack("<I", n & 0xFFFFFFFF)


def _i32(n: int) -> bytes:
    return struct.pack("<i", n)


def _u64(n: int) -> bytes:
    return struct.pack("<Q", max(0, int(n)))


def _f64(n: float) -> bytes:
    v = float(n)
    if not math.isfinite(v):
        v = 0.0
    return struct.pack("<d", v)


def _tds_str(s: str) -> bytes:
    body = s.encode("utf-8")
    return _u32(len(body)) + body


def _path_name(name: str) -> str:
    """Escape single quotes in a TDMS object-path component (' -> '')."""
    return name.replace("'", "''")


def _encode_properties(props: Mapping[str, PropValue] | None) -> bytes:
    items = list((props or {}).items())
    out = [_u32(len(items))]
    for key, value in items:
        out.append(_tds_str(key))
        if isinstance(value, str):
            out.append(_u32(_T_STRING))
            out.append(_tds_str(value))
        elif isinstance(value, bool):
            # bool is an int subclass — keep it as i32 (0/1)
            out.append(_u32(_T_I32))
            out.append(_i32(int(value)))
        elif isinstance(value, int) and abs(value) < 2 ** 31:
            out.append(_u32(_T_I32))
            out.append(_i32(value))
        else:
            out.append(_u32(_T_DOUBLE))
            out.append(_f64(float(value)))
    return b"".join(out)


Channel = Tuple[str, Sequence[float], Mapping[str, PropValue]]


def build_tdms(
    channels: Sequence[Channel],
    group: str = "Nexys",
    file_props: Mapping[str, PropValue] | None = None,
    group_props: Mapping[str, PropValue] | None = None,
) -> bytes:
    """Build a complete single-segment .tdms file as bytes.

    ``channels`` is a sequence of ``(name, data, properties)``. Channels are
    written non-interleaved (contiguous) so ragged lengths are fine.
    """
    group_path = "/'%s'" % _path_name(group)

    objects: List[bytes] = []

    # root "/"
    objects.append(b"".join([
        _tds_str("/"),
        _u32(0xFFFFFFFF),  # no raw data
        _encode_properties(file_props),
    ]))

    # group
    objects.append(b"".join([
        _tds_str(group_path),
        _u32(0xFFFFFFFF),
        _encode_properties(group_props),
    ]))

    # channels (each carries a raw data index)
    for name, data, props in channels:
        objects.append(b"".join([
            _tds_str("%s/'%s'" % (group_path, _path_name(name))),
            _u32(20),            # raw data index length prefix
            _i32(_T_DOUBLE),     # data type = double float
            _u32(1),             # 1-D
            _u64(len(data)),     # number of values
            _encode_properties(props),
        ]))

    metadata = _u32(len(channels) + 2) + b"".join(objects)

    # raw data (contiguous, float64 LE)
    raw_parts: List[bytes] = []
    for _name, data, _props in channels:
        raw_parts.append(struct.pack("<%dd" % len(data),
                                     *[(d if math.isfinite(d) else 0.0) for d in data]))
    raw_data = b"".join(raw_parts)

    next_segment_offset = len(metadata) + len(raw_data)
    raw_data_offset = len(metadata)
    lead_in = b"".join([
        _TAG,
        _u32(_TOC),
        _u32(_VERSION),
        _u64(next_segment_offset),
        _u64(raw_data_offset),
    ])

    return lead_in + metadata + raw_data


class TdmsSession:
    """Accumulates log_tdms() samples and flushes them to a real .tdms file."""

    def __init__(self, path: str, group: str = "Nexys Run",
                 file_props: Mapping[str, PropValue] | None = None) -> None:
        self.path = path
        self.group = group
        self.file_props = dict(file_props or {})
        self._data: "Dict[str, List[float]]" = {}
        self._order: List[str] = []
        self.closed = False

    def log(self, name: str, value: float) -> None:
        if name not in self._data:
            self._data[name] = []
            self._order.append(name)
        self._data[name].append(float(value))

    def flush(self) -> bytes:
        channels: List[Channel] = [
            (name, self._data[name], {"sample_count": len(self._data[name])})
            for name in self._order
        ]
        payload = build_tdms(
            channels,
            group=self.group,
            file_props={"producer": "nexys-sdk", "format": "TDMS 2.0", **self.file_props},
        )
        with open(self.path, "wb") as fh:
            fh.write(payload)
        return payload

    def close(self) -> str:
        if self.closed:
            return self.path
        self.flush()
        self.closed = True
        return self.path
