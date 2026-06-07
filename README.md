# Transam

A fast, dark, modern desktop remote for **Transmission 4.x** — a web-stack
replacement for Transmission Remote GUI, with native OS integration.

- **Stack:** Electron + React + TypeScript + Vite. The Transmission RPC runs in
  the Electron main process (no browser CORS limits). The renderer is a dense,
  dark, uTorrent-style UI.
- **English only**, targets the modern Transmission RPC (rpc-version ≥ 17).

## Features

- **Torrent list** — dense, dark, virtualized table (TanStack Table + Virtual);
  resizable/sortable columns, per-status icons, red bar for errored torrents.
- **Sidebar** — collapsible category filters (All/Downloading/Seeding/Active/
  Paused/Checking/Error) + dynamic labels; search box.
- **Toolbar + menu bar** — Add / Start / Pause / Remove; native File/Edit/Help
  menu (with About) that dispatches to the renderer.
- **Right-click menus** — torrents (start/pause/verify/reannounce/set-location/
  open folder/show in Explorer/remove); files (open/reveal/priority/skip).
- **Details** — redesigned General (name, big progress bar, **piece-availability
  map**, tidy Transfer/Info, **per-torrent seeding limits**), Files (progress
  bars, resizable columns, selection, double-click to open), Peers, Trackers.
- **Add dialog** — magnet / .torrent URL / OS-opened .torrent; native
  server-folder picker with local↔remote **path mapping**; **MRU destinations**
  and a **series heuristic** that suggests the folder used by other episodes.
- **OS integration** — registers as the `magnet:` handler and `.torrent` file
  association; single-instance; opens/reveals remote files via the mapped path.
- **Durable** — RPC timeouts, non-overlapping polls, reconnect banner, error
  toasts, and a shimmer over rows while an action is in flight. See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#durability).
- **Persisted UI** — sort, filter, panel sizes, column widths, window state.

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
