# Transmission RPC usage

Targets Transmission 4.x (rpc-version ≥ 17). Endpoint: `POST {scheme}://{host}:{port}{rpcPath}`
(default `/transmission/rpc`), body `{ method, arguments }`.

## Handshake & auth

- First call without a session id gets `409` with an `X-Transmission-Session-Id`
  header; the client stores it and retries once.
- HTTP Basic auth header is added when a username is configured.
- Each request is aborted after 20s.

## Methods used

| Method | When | Notes |
| --- | --- | --- |
| `session-get` | connect / poll / **Server Parameters** | `version`, `rpc-version`; speed-limit fields; the full settings set below |
| `session-stats` | poll | `downloadSpeed`, `uploadSpeed` |
| `session-set` | speed popover + **Server Parameters** | speed limits, plus the full settings set below |
| `port-test` | Server Parameters → Test port | returns `{ port-is-open }` |
| `torrent-get` | poll (list) | summary fields (see below) |
| `torrent-get` | selection (detail) | `files`, `fileStats`, `peers`, `trackerStats`, `pieces`, seeding fields |
| `torrent-start` / `-start-now` / `-stop` | actions | |
| `torrent-verify` / `-reannounce` | actions | |
| `torrent-set` | file priorities, seeding limits | `files-(un)wanted`, `priority-(high\|normal\|low)`, `seedRatioMode/Limit`, `seedIdleMode/Limit` |
| `torrent-set-location` | move | `{ location, move: true }` |
| `torrent-remove` | remove | `delete-local-data: bool` |
| `torrent-add` | add | `filename` (url/magnet) or `metainfo` (base64), `download-dir`, `paused` |

## List fields (`shared/types.ts` → `TORRENT_FIELDS`)

`id, name, status, totalSize, percentDone, recheckProgress, rateDownload,
rateUpload, eta, uploadRatio, sizeWhenDone, leftUntilDone, peersConnected,
peersSendingToUs, peersGettingFromUs, downloadDir, addedDate, doneDate,
activityDate, errorString, error, labels, downloadedEver, uploadedEver,
queuePosition`

## Detail fields (`DETAIL_FIELDS`)

`id, name, comment, hashString, pieceCount, pieceSize, pieces, dateCreated,
downloadDir, files, fileStats, peers, trackerStats, seedRatioLimit,
seedRatioMode, seedIdleLimit, seedIdleMode`

## Server Parameters (`session-set` / `session-get`)

The **Server Parameters** dialog (`ServerParamsModal`) reads and writes every
mutable session field, grouped into five tabs. Fields the server doesn't return
(older daemons) are hidden, so the dialog adapts to the connected version.

- **Downloads** — `download-dir`, `incomplete-dir[-enabled]`,
  `rename-partial-files`, `cache-size-mb`, `start-added-torrents`,
  `trash-original-torrent-files`, `seedRatioLimit[ed]`,
  `idle-seeding-limit[-enabled]`.
- **Network** — `peer-port`, `peer-port-random-on-start`,
  `port-forwarding-enabled`, `encryption` (`tolerated`/`preferred`/`required`),
  `peer-limit-global`, `peer-limit-per-torrent`, `pex-enabled`, `dht-enabled`,
  `lpd-enabled`, `utp-enabled`, `blocklist-enabled` + `blocklist-url`,
  `default-trackers` (newline-separated), plus a `port-test` button.
- **Bandwidth** — `speed-limit-(down\|up)[-enabled]`, `alt-speed-(down\|up)`,
  `alt-speed-enabled`, `alt-speed-time-enabled`, `alt-speed-time-(begin\|end)`
  (minutes since midnight), `alt-speed-time-day` (bitfield, bit0 = Sunday).
- **Queue** — `download-queue-(enabled\|size)`, `seed-queue-(enabled\|size)`,
  `queue-stalled-(enabled\|minutes)`.
- **Scripts** — `script-torrent-added-(enabled\|filename)`,
  `script-torrent-done-(enabled\|filename)`,
  `script-torrent-done-seeding-(enabled\|filename)`.

Folder fields use the native picker → daemon path via the same path mapping as
the rest of the app. `download-dir`/`incomplete-dir`/script paths are on the
**server's** filesystem.

## Status codes

`0` stopped · `1` check-wait · `2` checking · `3` download-wait · `4`
downloading · `5` seed-wait · `6` seeding.

## Notes / quirks

- There is **no** directory-listing RPC; destination browsing relies on a mounted
  share + path mapping (see ARCHITECTURE).
- `pieces` is base64 of a bitfield (`pieceCount` bits); rendered by `PieceBar`.
- `seedRatioMode`: 0 = use global, 1 = stop at ratio, 2 = seed forever.
  `seedIdleMode`: 0 = global, 1 = stop when idle, 2 = unlimited.
