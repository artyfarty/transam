// Minimal bencode decoder — enough to read a .torrent's info dict for a
// pre-add preview (name, files, sizes). Byte strings come back as Buffer;
// dict keys are decoded as UTF-8.

type Bencode = number | Buffer | Bencode[] | { [k: string]: Bencode };

export function decode(buf: Buffer): Bencode {
  let i = 0;

  function readInt(end: string): number {
    let s = '';
    while (buf[i] !== end.charCodeAt(0)) s += String.fromCharCode(buf[i++]);
    i++; // consume end
    return parseInt(s, 10);
  }

  function value(): Bencode {
    const c = buf[i];
    if (c === 0x69) {
      // 'i' integer
      i++;
      return readInt('e');
    }
    if (c === 0x6c) {
      // 'l' list
      i++;
      const arr: Bencode[] = [];
      while (buf[i] !== 0x65) arr.push(value());
      i++;
      return arr;
    }
    if (c === 0x64) {
      // 'd' dict
      i++;
      const obj: { [k: string]: Bencode } = {};
      while (buf[i] !== 0x65) {
        const key = (value() as Buffer).toString('utf8');
        obj[key] = value();
      }
      i++;
      return obj;
    }
    // byte string: <len>:<bytes>
    const len = readInt(':');
    const out = buf.subarray(i, i + len);
    i += len;
    return out;
  }

  return value();
}

export interface ParsedTorrent {
  name: string;
  totalSize: number;
  files: { name: string; length: number }[];
}

export function parseTorrentFile(metainfoB64: string): ParsedTorrent {
  const buf = Buffer.from(metainfoB64, 'base64');
  const meta = decode(buf) as { info?: Record<string, Bencode> };
  const info = meta.info;
  if (!info || !(info.name instanceof Buffer)) throw new Error('not a valid .torrent');
  const name = info.name.toString('utf8');
  const files: { name: string; length: number }[] = [];
  let totalSize = 0;
  if (Array.isArray(info.files)) {
    for (const f of info.files as { length: number; path: Buffer[] }[]) {
      const p = (f.path as unknown as Buffer[]).map((b) => b.toString('utf8')).join('/');
      files.push({ name: p, length: f.length });
      totalSize += f.length;
    }
  } else {
    totalSize = (info.length as number) ?? 0;
    files.push({ name, length: totalSize });
  }
  return { name, totalSize, files };
}
