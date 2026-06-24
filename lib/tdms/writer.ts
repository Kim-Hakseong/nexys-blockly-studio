/**
 * Minimal, spec-compliant TDMS 2.0 binary writer.
 *
 * Produces a single-segment .tdms file with one channel group and N
 * double-float (float64) channels. The byte layout follows NI's
 * "TDMS File Format Internal Structure" and is byte-compatible with the
 * npTDMS writer, so files open in LabVIEW / DIAdem / npTDMS.
 *
 * Reference: ni.com TDMS internal structure; npTDMS nptdms/writer.py
 *   raw data index for a numeric channel = [Uint32(20), Int32(type),
 *   Uint32(dim=1), Uint64(count)]; no-data objects use 0xFFFFFFFF.
 */

const TDS_TAG = Uint8Array.from([0x54, 0x44, 0x53, 0x6d]); // "TDSm"
const VERSION = 4713; // TDMS v2.0
// ToC = kTocMetaData(0x02) | kTocNewObjList(0x04) | kTocRawData(0x08)
const TOC = 0x02 | 0x04 | 0x08;

const TDS_TYPE_I32 = 3;
const TDS_TYPE_DOUBLE = 10; // 0x0A
const TDS_TYPE_STRING = 0x20;

const enc = new TextEncoder();

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}
function i32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, n | 0, true);
  return b;
}
function u64(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(Math.max(0, Math.floor(n))), true);
  return b;
}
function f64(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, Number.isFinite(n) ? n : 0, true);
  return b;
}
/** TDMS string: uint32 byte-length + UTF-8 bytes. */
function tdsStr(s: string): Uint8Array {
  const body = enc.encode(s);
  return concat([u32(body.length), body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/** Escape single quotes in a TDMS object-path component (' → ''). */
function pathName(name: string): string {
  return name.replace(/'/g, "''");
}

type PropValue = string | number;

function encodeProperties(props: Record<string, PropValue> | undefined): Uint8Array {
  const entries = Object.entries(props ?? {});
  const parts: Uint8Array[] = [u32(entries.length)];
  for (const [key, value] of entries) {
    parts.push(tdsStr(key));
    if (typeof value === 'string') {
      parts.push(u32(TDS_TYPE_STRING), tdsStr(value));
    } else if (Number.isInteger(value) && Math.abs(value) < 2 ** 31) {
      parts.push(u32(TDS_TYPE_I32), i32(value));
    } else {
      parts.push(u32(TDS_TYPE_DOUBLE), f64(value));
    }
  }
  return concat(parts);
}

export interface TdmsChannelInput {
  name: string;
  data: number[];
  properties?: Record<string, PropValue>;
}

export interface BuildTdmsOptions {
  /** channel-group name (default 'Nexys') */
  group?: string;
  /** file-level (root object) properties */
  fileProps?: Record<string, PropValue>;
  /** per-group properties */
  groupProps?: Record<string, PropValue>;
}

/**
 * Build a complete single-segment .tdms file as bytes.
 * Channels are written non-interleaved (contiguous), so ragged channel
 * lengths are fine — each channel declares its own sample count.
 */
export function buildTdms(channels: TdmsChannelInput[], opts: BuildTdmsOptions = {}): Uint8Array {
  const group = opts.group ?? 'Nexys';
  const groupPath = `/'${pathName(group)}'`;

  // ---- metadata -------------------------------------------------
  const objects: Uint8Array[] = [];

  // root object "/"
  objects.push(concat([
    tdsStr('/'),
    u32(0xffffffff), // no raw data
    encodeProperties(opts.fileProps),
  ]));

  // group object
  objects.push(concat([
    tdsStr(groupPath),
    u32(0xffffffff),
    encodeProperties(opts.groupProps),
  ]));

  // channel objects (each with a raw data index)
  for (const ch of channels) {
    objects.push(concat([
      tdsStr(`${groupPath}/'${pathName(ch.name)}'`),
      // raw data index: total 20 bytes = len-prefix(20) covers type+dim+count
      u32(20),
      i32(TDS_TYPE_DOUBLE),
      u32(1),                 // 1-D array
      u64(ch.data.length),    // number of values
      encodeProperties(ch.properties),
    ]));
  }

  const metadata = concat([u32(channels.length + 2), ...objects]);

  // ---- raw data (contiguous, float64 LE) ------------------------
  const rawParts: Uint8Array[] = [];
  for (const ch of channels) {
    const buf = new Uint8Array(ch.data.length * 8);
    const dv = new DataView(buf.buffer);
    for (let i = 0; i < ch.data.length; i++) {
      dv.setFloat64(i * 8, Number.isFinite(ch.data[i]) ? ch.data[i] : 0, true);
    }
    rawParts.push(buf);
  }
  const rawData = concat(rawParts);

  // ---- lead-in (28 bytes) --------------------------------------
  const nextSegmentOffset = metadata.length + rawData.length;
  const rawDataOffset = metadata.length;
  const leadIn = concat([
    TDS_TAG,
    u32(TOC),
    u32(VERSION),
    u64(nextSegmentOffset),
    u64(rawDataOffset),
  ]);

  return concat([leadIn, metadata, rawData]);
}
