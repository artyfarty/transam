# Changelog

Each `## <version>` section becomes the notes of the matching GitHub release
(`.github/workflows/release.yml` on tagging, `release-notes.yml` when this file
changes later). Write for users: what changed for them, not the diff.

## 0.4.0 — 2026-10-09

### New
- **Rename while adding.** The Add dialog has a *Save as* field: give the file (single-file torrents) or the top folder a proper name before it lands on disk, instead of keeping the release name. For single files, focusing the field selects just the name, so the extension stays.
- **Magnets too.** For a magnet link the new name is remembered and applied as soon as the metadata arrives (even across a restart of Transam).
- **Rename later.** *Rename…* in a torrent's right-click menu (or **F2**), and in the Files tab for individual files.

## 0.3.0 — 2026-10-06

### New
- **Drag and drop.** Drop `.torrent` files or magnet links onto the window to add them; several at once go through the Add dialog one by one.
- **Update check.** On startup Transam looks for a newer release here and shows a banner with *Download* / *Skip this version*. Can be turned off in Preferences; *Help → Check for Updates* checks on demand.

### Fixed
- **Clear "can't open" errors.** Opening or revealing a file whose server path has no path mapping used to produce a confusing system error. Now Transam says what's wrong (no mapping, or the mapped share isn't reachable) and offers a **Path mappings…** button that takes you straight to the setting, with a row already started for that folder.
- A path mapping for `/mnt/down` no longer also matches `/mnt/downloads`.

## 0.2.0 — 2026-10-05

### New
- **macOS builds** — DMGs for Apple Silicon and Intel. They aren't notarized: on first launch allow Transam in *System Settings → Privacy & Security → Open Anyway*, or run `xattr -dr com.apple.quarantine /Applications/Transam.app`.
- macOS niceties: the standard app menu (Cmd+Q/C/V work), a menu-bar sized tray icon, "Show in Finder".

### Fixed
- Right-clicking a multi-selection no longer collapses it to a single torrent (torrent list and Files tab).
- Windows search and Task Manager show the app as **Transam** rather than its tagline.
