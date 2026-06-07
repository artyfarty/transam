# Transam

A fast, dark, modern desktop remote for **Transmission 4.x** — a replacement for
Transmission Remote GUI, with native OS integration. Dark theme by default, with
a light theme available. English-only UI.

## Features

- **Torrent list** — a dense, uTorrent-style table: sort by any column, drag to
  resize, right-click the header to show/hide columns, navigate with the arrow
  keys. Coloured status badges, a red bar for errored torrents, an *Added*
  date, and a ratio cell that fills toward your seed-ratio limit.
- **Labels** — shown as coloured tag chips after the name; edit them from the
  right-click menu. **Auto-labelling rules** (path wildcard → label, e.g.
  `*/Movies/*` → Movie) tag new torrents automatically, with a one-click
  *Apply to existing* in settings.
- **Sidebar** — collapsible filters by category (Downloading, Seeding, Paused,
  Error, …) and by label; plus a search box.
- **Add** — paste a magnet / .torrent link or pick a file, then see a **preview**
  (name, size, file list) before adding and choose where to save. Picks the
  destination smartly: recent folders, and a **series guesser** that drops new
  episodes next to the rest of the show (newest season wins).
- **Details** — overview with a piece-availability map and per-torrent seeding
  limits; Files (with per-file progress, priorities, double-click to open);
  Peers; Trackers.
- **Open from anywhere** — handles `magnet:` links and `.torrent` files clicked
  in your browser/Explorer; double-click a file to open it (or *Show in
  Explorer*) on the mapped network drive.
- **Save where it lives on the server** — pick the destination through a native
  folder dialog on your mounted share; Transam maps it to the daemon's path.
- **Preferences** — theme (**dark by default, light available**), interface
  **scale** (for bigger text), label rules, register file associations.
- **Stays responsive** — never freezes waiting on the server: it reconnects on
  its own, shows errors as toasts, and animates a row while its action is in
  flight. Remembers your layout (columns, panels, sort, window size) and shows
  dates in your regional format.

## Under the hood

Electron + React + TypeScript + Vite. The Transmission RPC runs in the Electron
**main process** (no browser CORS limits); the renderer is a pure view that
sends intents over a typed IPC bridge. The torrent table is virtualized for
thousands of rows, the durability behaviour (timeouts, non-overlapping polls,
error boundary) is deliberate, and `.torrent`/magnet previews are parsed locally
without touching the daemon. Targets Transmission RPC ≥ 17. Details in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/RPC.md](docs/RPC.md).

## Run / develop

From a WSL terminal (WSLg provides `DISPLAY=:0`):

```sh
pnpm install
pnpm dev        # vite + electron; window shows on Windows via WSLg
pnpm build      # compile main + renderer
pnpm dist       # package with electron-builder (Windows needs wine on Linux)
```

First launch shows the **Connect** dialog → enter your Transmission host, port
(9091), and auth. Add **path mappings** there too (e.g. `Z:\downloads` →
`/mnt/downloads`) so the folder picker and "open/reveal" translate Windows paths
to daemon paths. Connection config lives in Electron `userData` (never in the
repo, no hardcoded hosts).

A native Windows build can also be assembled without wine — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#packaging).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — process model, IPC surface,
  data flow, path mapping, series heuristic, durability, packaging.
- [docs/RPC.md](docs/RPC.md) — Transmission RPC methods and fields used.

Dependencies are pinned to specific, well-aged versions; `.npmrc` sets
`minimum-release-age` to refuse very fresh publishes.
