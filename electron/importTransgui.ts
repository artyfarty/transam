// Import connection profiles from a legacy Transmission Remote GUI install.
//
// transgui keeps its settings in an INI file (`transgui.ini`). Connections live
// in `[Connection.<name>]` sections (or a single legacy `[Connection]`), with
// the list of names and the current one in `[Hosts]`. Passwords are stored
// base64-encoded; a literal "-" means "not stored, prompt each time". Path
// mappings are a single `PathMap` value: `remote=local` entries joined by `|`.
//
// See the original Pascal: main.pas `TMainForm.DoConnect` and `MapRemoteToLocal`.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ServerConfig, PathMapping, ImportedProfile, ImportResult } from '../shared/types';

const DEFAULT_RPC_PATH = '/transmission/rpc'; // transgui's DefaultRpcPath (rpc.pas)

type Section = Map<string, string>; // key (lower-case) -> raw value
type Ini = Map<string, { name: string; values: Section }>; // section key (lower-case) -> data

/** A tiny INI reader. Keeps the original-case section name so we can recover
 *  the profile name after the `Connection.` prefix. Last value for a key wins. */
function parseIni(text: string): Ini {
  const ini: Ini = new Map();
  let cur: { name: string; values: Section } | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const name = line.slice(1, -1);
      cur = { name, values: new Map() };
      ini.set(name.toLowerCase(), cur);
      continue;
    }
    if (!cur) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    cur.values.set(line.slice(0, eq).trim().toLowerCase(), line.slice(eq + 1));
  }
  return ini;
}

function decodePassword(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v || v === '-') return ''; // "-" = transgui kept it only in memory
  try {
    return Buffer.from(v, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/** transgui PathMap: `remote=local` entries joined by `|`. */
function parsePathMap(raw: string | undefined): PathMapping[] {
  const out: PathMapping[] = [];
  for (const entry of (raw ?? '').split('|')) {
    const eq = entry.indexOf('=');
    if (eq < 0) continue;
    const remote = entry.slice(0, eq).trim();
    const local = entry.slice(eq + 1).trim();
    if (remote && local) out.push({ local, remote });
  }
  return out;
}

function profileFromSection(name: string, s: Section): ImportedProfile | null {
  const host = (s.get('host') ?? '').trim();
  if (!host) return null; // a section without a host is not a usable profile
  const port = Number.parseInt(s.get('port') ?? '', 10);
  const config: ServerConfig = {
    host,
    port: Number.isFinite(port) ? port : 9091,
    rpcPath: (s.get('rpcpath') ?? '').trim() || DEFAULT_RPC_PATH,
    useHttps: /^(1|true|yes)$/i.test((s.get('usessl') ?? '').trim()),
    username: (s.get('username') ?? '').trim(),
    password: decodePassword(s.get('password')),
    pathMappings: parsePathMap(s.get('pathmap')),
  };
  return { name, config };
}

/** Extract every connection profile, current one first. */
export function parseProfiles(text: string): ImportedProfile[] {
  const ini = parseIni(text);
  const profiles: ImportedProfile[] = [];
  const seen = new Set<string>();

  const add = (name: string, sectionKey: string) => {
    if (seen.has(sectionKey)) return;
    const sec = ini.get(sectionKey);
    if (!sec) return;
    const p = profileFromSection(name, sec.values);
    if (p) {
      profiles.push(p);
      seen.add(sectionKey);
    }
  };

  // Ordered names from [Hosts]: CurHost first, then Host1, Host2, …
  const hosts = ini.get('hosts')?.values;
  if (hosts) {
    const cur = (hosts.get('curhost') ?? '').trim();
    if (cur) add(cur, `connection.${cur.toLowerCase()}`);
    for (let i = 1; ; i++) {
      const name = (hosts.get(`host${i}`) ?? '').trim();
      if (!name) break;
      add(name, `connection.${name.toLowerCase()}`);
    }
  }

  // Any remaining Connection.<name> sections not referenced by [Hosts].
  for (const [key, { name }] of ini) {
    if (key.startsWith('connection.')) add(name.slice('Connection.'.length), key);
  }

  // Legacy single, unnamed [Connection].
  add(profiles.length ? 'Imported' : 'Default', 'connection');

  return profiles;
}

/** Candidate transgui.ini locations, derived from the standard config dirs.
 *  transgui uses GetAppConfigDir → %LOCALAPPDATA%\Transmission Remote GUI\, but
 *  we also probe Roaming and a couple of alternate folder names, and the
 *  portable layout (transgui.ini next to the exe). */
export function candidatePaths(dirs: string[]): string[] {
  const folders = ['Transmission Remote GUI', 'transgui'];
  const out: string[] = [];
  for (const base of dirs) {
    if (!base) continue;
    for (const f of folders) out.push(path.join(base, f, 'transgui.ini'));
    out.push(path.join(base, 'transgui.ini')); // portable / dir-itself
  }
  return out;
}

export function locateIni(searchDirs: string[]): string | null {
  for (const p of candidatePaths(searchDirs)) {
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* not here, keep looking */
    }
  }
  return null;
}

/** Auto-detect (or read an explicit path) and return the profiles found. */
export function importProfiles(searchDirs: string[], explicitPath?: string): ImportResult {
  const file = explicitPath ?? locateIni(searchDirs);
  if (!file) return { found: false, profiles: [] };
  try {
    const text = fs.readFileSync(file, 'utf8');
    return { found: true, path: file, profiles: parseProfiles(text) };
  } catch (e) {
    return { found: true, path: file, profiles: [], error: (e as Error).message };
  }
}
