# Handoff notes (overnight build)

Built blind overnight; everything typechecks, builds, and passes a headless
runtime smoke test (Electron boots, React mounts, no JS errors). I could not
verify the UI **visually** — that's the first thing to do in the morning.

## Run it

From a WSL terminal (it has `DISPLAY` from WSLg):

```sh
cd ~/work/transom
pnpm dev      # vite + electron; window shows on Windows via WSLg
```

The dev launcher already passes `--disable-gpu --no-sandbox` because WSLg's GL
stack otherwise crashes Electron's GPU process. (A packaged Windows build won't
need that.)

First launch shows the **Connect** dialog → enter your NAS Transmission host,
port (9091), and auth. Add **path mappings** there too (e.g. `Z:\downloads` →
`/mnt/downloads`) so the "Browse…" folder picker translates Windows paths to
daemon paths.

## What works (MVP)

- Connect dialog + path-mapping editor; config saved in Electron `userData`
  (never in the repo, no hardcoded hosts).
- Live torrent list: dense dark uTorrent-ish table, hand-virtualized, sortable
  columns, category sidebar + label filters + search.
- Toolbar: add (magnet / .torrent URL, native server-folder picker), start,
  pause, remove.
- Right-click menu: start / start-now / pause / verify / reannounce /
  set-location / remove / remove+data. Shift-click range select.
- Details tabs: General, Files (wanted + priority), Peers, Trackers.
- OS handoff: registered `magnet:` handler + `.torrent` file association
  (packaging) and argv/second-instance/open-url/open-file routing → Add dialog.
- Keyboard: Space pause/start, Delete remove, Ctrl+A select all, Esc clear.
- Persisted sort + filter.

## Known gaps / next

- **Visual pass** — confirm density/colors actually look right (built blind).
- Add-by-local-.torrent-file from the toolbar (currently only URL/magnet in the
  dialog; OS-opened .torrent files do work via metainfo).
- Alt-speed (turtle) toggle, session settings (global limits), free-space hint.
- Column resize/reorder + show/hide; remember widths.
- Copy-magnet in context menu (needs the `magnetLink` field).
- Packaging a real Windows `.exe` (`pnpm dist`) once the UI looks right.
- Per-torrent labels editing; queue reorder (drag).

## Architecture

- `electron/` — main process: `transmission.ts` (RPC client, session-id
  handshake, basic auth), `main.ts` (window, IPC, native dialogs, OS handlers),
  `preload.ts` (typed `window.api`).
- `shared/types.ts` — types shared by main + renderer.
- `src/` — React renderer. `App.tsx` orchestrates polling + state. Components in
  `src/components/`. No TanStack — table virtualization is hand-rolled in
  `TorrentTable.tsx`.
- Build: `vite` (renderer) + `tsc` (CommonJS main) — see `package.json` scripts.
