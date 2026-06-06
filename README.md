# Transom

A fast, dark, modern desktop remote for **Transmission 4.x** — a spiritual
replacement for Transmission Remote GUI, built on a web stack so theming and
layout are trivial while keeping native OS integration.

- **Stack:** Electron + React + TypeScript + Vite. RPC runs in the Electron main
  process (no browser CORS limits). Renderer is a dense, dark, uTorrent-style UI.
- **No heavy table deps:** the torrent list is hand-virtualized (~50 lines), so
  thousands of rows update every poll without lag.
- **English only**, targets the modern Transmission RPC (rpc-version ≥ 17).

## Status (MVP)

- Connection dialog (host/port/path/https/auth), config stored in Electron
  `userData` (never in the repo).
- Live torrent list: name, size, progress bar, status, seeds/peers, down/up,
  ETA, ratio — sorted by queue order.
- Toolbar: add (magnet / .torrent URL, with native server-folder picker +
  local→remote path mapping), start, pause, remove.
- Details pane + status bar (speeds, counts).

## Roadmap

- OS handlers for `magnet:` links and `.torrent` files (native shell registers
  them, like the old transgui did).
- Files / peers / trackers detail tabs, per-file priorities.
- Left category sidebar, column config, multi-select range, sorting by column.
- Path-mapping editor in settings.

## Develop

```sh
pnpm install
pnpm dev        # vite + electron (WSLg shows the window on Windows)
pnpm build      # compile main + renderer
pnpm dist       # package (electron-builder)
```

Dependencies are pinned to specific, well-aged versions; `.npmrc` sets
`minimum-release-age` to refuse very fresh publishes.
