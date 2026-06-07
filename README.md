# Transam

A fast, dark, modern desktop remote for **Transmission 4.x** — a web-stack
replacement for Transmission Remote GUI, with native OS integration.

- **Stack:** Electron + React + TypeScript + Vite. The Transmission RPC runs in
  the Electron main process (no browser CORS limits). The renderer is a dense,
  dark, uTorrent-style UI.
- **English only**, targets the modern Transmission RPC (rpc-version ≥ 17).

## Features

- **Torrent list** — dense, dark, virtualized table (TanStack Table + Virtual);
  resizable/sortable columns, a right-click **column picker** (show/hide),
  arrow-key navigation, coloured **status badges**, red bar for errored
  torrents, an **Added** date column, and a ratio cell that becomes a
  **progress bar toward the seed-ratio limit**.
- **Labels** — server-side labels shown as coloured **tag chips** after the
  name; edit them per selection; **path→label rules** with wildcards in
  settings (defaults: `*/Movies/*`→Movie, `*/Anime/*`→Anime, `*/TV Shows/*`→TV
  Show) auto-apply to new torrents, with an *Apply to existing* button.
- **Sidebar** — collapsible category filters (All/Downloading/Seeding/Active/
  Paused/Checking/Error) + dynamic label filters; search box.
- **Menu + toolbar** — a custom File/Edit/Help menu bar (with About) sharing the
  toolbar row; Add / Start / Pause / Remove buttons.
- **Right-click menus** — torrents (start/pause/verify/reannounce/set-location/
  labels/open folder/show in Explorer/remove); files (open/reveal/priority/skip).
- **Details** — redesigned General (name, big progress bar, **piece-availability
  map**, tidy Transfer/Info, **per-torrent seeding limits**), Files (progress
  bars, resizable columns, selection, double-click to open), Peers, Trackers.
- **Add wizard** — two steps: paste a magnet / .torrent URL or pick a file (step
  skipped when opened via the OS), then a **preview** parsed locally (name,
  size, files / hash + trackers) where you choose the destination. Native
  server-folder picker with local↔remote **path mapping**, **MRU destinations**,
  and a **series heuristic** that suggests the folder of other episodes (latest
  season wins).
- **OS integration** — registers as the `magnet:` handler and `.torrent` file
  association (button in settings); single-instance; opens/reveals remote files
  via the mapped path.
- **Preferences** — dark/light **theme**, **interface scale** (accessibility),
  label rules, file associations.
- **Durable** — RPC timeouts, non-overlapping polls, reconnect banner, error
  toasts, an error boundary, and a shimmer over rows while an action is in
  flight. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#durability).
- **Locale-aware** dates (OS regional settings); **persisted UI** — theme,
  scale, sort, filter, panel sizes, column widths/visibility, window state.

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
