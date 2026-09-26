// Reads a video's real duration (seconds) from the file bytes, without ffmpeg.
// Supports MP4 / MOV (ISO BMFF "mvhd" box) and WebM / Matroska (EBML Info > Duration).
// Returns null if the duration can't be found.

export function readVideoDuration(bytes: Uint8Array): number | null {
  if (bytes.length < 16) return null;
  // EBML magic 1A 45 DF A3 -> WebM / Matroska
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return readEbmlDuration(bytes);
  return readMp4Duration(bytes);
}

// ── MP4 / MOV ───────────────────────────────────────────────────
function readMp4Duration(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const findBox = (start: number, end: number, type: string): { start: number; end: number } | null => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = view.getUint32(offset);
      const name = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        size = Number(view.getBigUint64(offset + 8));
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header) return null;
      if (name === type) return { start: offset + header, end: Math.min(end, offset + size) };
      offset += size;
    }
    return null;
  };
  const moov = findBox(0, bytes.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(moov.start, moov.end, "mvhd");
  if (!mvhd || mvhd.end - mvhd.start < 20) return null;
  const version = bytes[mvhd.start];
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (mvhd.end - mvhd.start < 32) return null;
    timescale = view.getUint32(mvhd.start + 20);
    duration = Number(view.getBigUint64(mvhd.start + 24));
  } else {
    timescale = view.getUint32(mvhd.start + 12);
    duration = view.getUint32(mvhd.start + 16);
  }
  if (!timescale || duration === 0xffffffff) return null;
  return duration / timescale;
}

// ── WebM / Matroska ─────────────────────────────────────────────
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;

function readVint(bytes: Uint8Array, offset: number, keepMarker: boolean): { value: number; length: number; unknown: boolean } | null {
  const first = bytes[offset];
  if (first === undefined || first === 0) return null;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || offset + length > bytes.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[offset + i];
    if (bytes[offset + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

function readEbmlDuration(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const element = (offset: number) => {
    const id = readVint(bytes, offset, true);
    if (!id) return null;
    const size = readVint(bytes, offset + id.length, false);
    if (!size) return null;
    const dataStart = offset + id.length + size.length;
    return { id: id.value, dataStart, dataEnd: size.unknown ? bytes.length : Math.min(bytes.length, dataStart + size.value) };
  };

  // skip EBML header
  const header = element(0);
  if (!header) return null;
  let offset = header.dataEnd;
  // find Segment
  let segment = null;
  while (offset < bytes.length) {
    const el = element(offset);
    if (!el) return null;
    if (el.id === SEGMENT) { segment = el; break; }
    offset = el.dataEnd;
  }
  if (!segment) return null;
  // find Info inside Segment
  offset = segment.dataStart;
  while (offset < segment.dataEnd) {
    const el = element(offset);
    if (!el) return null;
    if (el.id === INFO) {
      let scale = 1_000_000;
      let duration: number | null = null;
      let inner = el.dataStart;
      while (inner < el.dataEnd) {
        const child = element(inner);
        if (!child) break;
        const len = child.dataEnd - child.dataStart;
        if (child.id === TIMECODE_SCALE) {
          let v = 0;
          for (let i = child.dataStart; i < child.dataEnd; i++) v = v * 256 + bytes[i];
          if (v > 0) scale = v;
        } else if (child.id === DURATION) {
          if (len === 4) duration = view.getFloat32(child.dataStart);
          else if (len === 8) duration = view.getFloat64(child.dataStart);
        }
        inner = child.dataEnd;
      }
      return duration === null ? null : (duration * scale) / 1e9;
    }
    offset = el.dataEnd;
  }
  return null;
}
