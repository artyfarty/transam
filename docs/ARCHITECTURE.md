# Architecture

## Process model

Two processes, classic Electron:

- **Main** (`electron/`, compiled to CommonJS by `tsc`):
  - `main.ts` — window lifecycle, window-state persistence, the native
    application menu, OS magnet/.torrent handoff, native dialogs, and all IPC
    handlers. Owns the single `TransmissionClient`.
  - `transmission.ts` — the RPC client: builds the endpoint URL, does the
    `X-Transmission-Session-Id` 409 handshake, HTTP basic auth, and aborts
    requests after a timeout.
  - `preload.ts` — `contextBridge` exposes a typed `window.api` to the renderer.
- **Renderer** (`src/`, bundled by Vite): the React UI. It never talks to the
  daemon directly — everything goes through `window.api` (IPC) to the main
  process, which sidesteps browser CORS and keeps credentials out of the page.

`shared/types.ts` holds the types used by both sides.

## Why RPC lives in main

A browser page can't call the Transmission RPC: the daemon doesn't send CORS
headers and gates on a session-id header. The main process is a normal Node
context with `fetch`, so it has neither limitation. The renderer stays a pure
view that issues intents over IPC.

## IPC surface (`window.api`)

| Channel | Purpose |
| --- | --- |
| `config:get` / `config:set` | server connection config (in `userData`) |
| `config:importTransgui` | parse connection profiles from a legacy `transgui.ini` |
| `dialog:pickImportFile` | pick a `transgui.ini` when auto-detect misses |
| `rpc:test` | `session-get` for version / liveness |
| `torrents:get` | `torrent-get` list (summary fields) |
| `torrents:detail` | `torrent-get` for one id (files/peers/trackers/pieces…) |
| `torrents:action` | start / start-now / stop / verify / reannounce / remove |
| `torrents:set` | generic `torrent-set` (file priorities, seeding limits…) |
| `torrents:setLocation` | `torrent-set-location` (move) |
| `torrents:add` | `torrent-add` (url/magnet or base64 metainfo) |
| `session:stats` / `session:get` / `session:set` | speeds + global limits |
| `dialog:pickFolder` | native folder picker → `{local, remote}` (mapped) |
| `shell:openPath` / `shell:showItem` | open / reveal a daemon path locally |
| `menu-action` (main→renderer) | native menu item clicked |
| `open-add` (main→renderer) | OS opened a magnet/.torrent |

## Data flow

`App.tsx` orchestrates state and a **self-scheduling poll loop**: it runs
`torrent-get` + `session-stats` + `session-get` (limits), then schedules the
next run only after the previous settles (no overlap). The selected torrent has
its own detail loop. UI prefs (sort/filter/panel sizes/column widths) are
persisted to `localStorage`; window bounds/maximized state to
`userData/window.json`.

## Path mapping

Transmission speaks in **daemon** paths (e.g. `/mnt/downloads`). The user mounts
the same storage on Windows (e.g. `Z:\downloads`) and configures
`pathMappings` in the connect dialog. Main translates both ways:

- `localToRemote` — a folder picked in the native dialog → the daemon path sent
  in `download-dir` / `torrent-set-location`.
- `remoteToLocal` — a daemon path → the local path for `shell.openPath` /
  `shell.showItemInFolder` (with `/`↔`\` fixup for Windows targets).

Transmission RPC has no directory-listing method, so this mount + mapping is how
a native folder browser works against the server's filesystem.

## Series heuristic (`src/series.ts`)

`seriesKey(name)` collapses episode/part numbering (`S01E05`, `Part 2`, trailing
numbers, resolution noise) to a stable key. When adding, the dialog computes the
key for the new torrent (from the magnet `dn` or `.torrent` name) and suggests
the download folder most used by existing torrents with the same key — until the
user edits the destination.

## Importing from Transmission Remote GUI

The Connect dialog can pull connection profiles from a legacy **Transmission
Remote GUI** install (`electron/importTransgui.ts`). transgui stores its config
in an INI file, auto-located under the standard config dirs (it ships as
`%LOCALAPPDATA%\Transmission Remote GUI\transgui.ini`; Roaming, alternate folder
names, and a portable layout are also probed). If auto-detection misses, the
user can point at the file.

Each `[Connection.<name>]` section (or the legacy single `[Connection]`) becomes
a profile; `[Hosts]` gives the order and the current one. Mapped fields: `Host`,
`Port`, `UserName`, `Password` (base64, or `-` = not stored → blank), `UseSSL` →
`useHttps`, `RpcPath` (default `/transmission/rpc`), and `PathMap` — transgui's
`remote=local` entries joined by `|`, which map to our `{ remote, local }`
pairs. Proxy settings are intentionally not imported (unsupported). With one
profile the form is filled directly; with several the user picks one. Nothing is
saved until they hit Connect.

## Durability

- **Timeouts** — `TransmissionClient` aborts each request via
  `AbortSignal.timeout` so a hung daemon can't leave promises pending forever.
- **No pile-up** — poll loops self-schedule (await, then queue next), so slow
  responses don't stack overlapping requests.
- **Feedback** — a disconnected banner auto-retries; action failures raise a
  transient toast; a row shows a shimmer sweep while its action is in flight,
  cleared once the response + refresh land (no invented pseudo-statuses).

## Packaging

`pnpm dist` builds the Windows **NSIS installer** (`electron-builder --win
nsis`) — `release/Transam Setup <v>.exe`, with desktop + Start-menu shortcuts,
an uninstaller, and the magnet/.torrent associations. On Linux this needs wine
**and 32-bit support** (`dpkg --add-architecture i386 && apt install wine32`),
since electron-builder runs the 32-bit `rcedit` under wine to stamp the exe
icon/metadata. Building on Windows with Node avoids wine entirely.

As a wine-free alternative, the native window/taskbar build is assembled by
dropping `dist/` + `dist-electron/` + `package.json` into `resources/app/` of an
extracted Electron Windows prebuilt (the renderer is bundled and the main
process has no third-party runtime deps), renaming `electron.exe` →
`Transam.exe`. The exe's icon and version metadata (otherwise Electron's
defaults) are patched with `rcedit` (a native Windows tool, no wine):
`rcedit Transam.exe --set-icon icon.ico --set-version-string ProductName Transam …`.
Iterating only needs the `resources/app/` payload refreshed; a full prebuilt
copy needs the rename + rcedit re-applied. Deploy target: `C:\Progs\Transam`.
