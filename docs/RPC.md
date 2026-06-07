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
| `session-get` | connect / poll | `version`, `rpc-version`; speed-limit fields |
| `session-stats` | poll | `downloadSpeed`, `uploadSpeed` |
| `session-set` | speed limit popover | `speed-limit-(down\|up)[-enabled]` |
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

## Status codes

`0` stopped · `1` check-wait · `2` checking · `3` download-wait · `4`
downloading · `5` seed-wait · `6` seeding.

## Notes / quirks

- There is **no** directory-listing RPC; destination browsing relies on a mounted
  share + path mapping (see ARCHITECTURE).
- `pieces` is base64 of a bitfield (`pieceCount` bits); rendered by `PieceBar`.
- `seedRatioMode`: 0 = use global, 1 = stop at ratio, 2 = seed forever.
  `seedIdleMode`: 0 = global, 1 = stop when idle, 2 = unlimited.
