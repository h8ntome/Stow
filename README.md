# stow

A smart local file organiser. Sort files into folders using rules you define — or let Smart Cleanup handle it automatically.

Runs as a CLI with an optional browser-based UI. No cloud, no account, no tracking. Everything stays on your machine.

---

## Features

- **Smart Cleanup** — one click sorts files into Screenshots, Images, Videos, Audio, Documents, Code, Archives, and Design folders
- **7 rule types** — category, extension, keyword, size, regex, date group, date range
- **Web UI** — visual rule editor, live preview before any files move, drag-to-reorder rules
- **Terminal mode** — interactive prompts, no browser needed
- **`stow.`** — repeat your last cleanup with zero config
- **Dark and light mode**
- Rules persist across sessions in `~/.stow/config.json`

---

## Requirements

- Node.js 18 or later

---

## Installation

```bash
npm install -g stow-files
```

---

## Usage

### `stow`

Launches an interactive prompt to choose between Web UI and Terminal mode.

```
$ stow

  ◆  stow — file organiser

  ◆  How would you like to run stow?
  │  ● Web UI   — opens in browser, with visual rule editor
  │  ○ Terminal — interactive prompts, no browser
```

**Web UI** opens `http://localhost:3000` in your browser. You can:
- Set source and destination folders
- Run Smart Cleanup with one click
- Add custom rules with a visual editor
- Preview exactly which files will move and where
- Apply when ready

**Terminal mode** walks you through the same flow with interactive prompts in your terminal.

---

### `stow.`

Repeats your last cleanup with zero config.

```
$ stow.

  ◆  stow. — repeat last cleanup

  ┌ Last cleanup ─────────────────────────────────
  │  Source:       /Users/you/Downloads
  │  Destination:  /Users/you/Organised
  │  Rules:        12 rule(s)
  │  Last run:     26 Mar 2025, 14:30
  │  Files moved:  47
  └──

  ◆  Run this again using:
  │  ● Terminal
  │  ○ Web UI
```

---

## Rule types

| Type | What it matches |
|------|----------------|
| `category` | File type group: `images`, `videos`, `audio`, `documents`, `archives`, `code`, `screenshots`, `fonts` |
| `extension` | Specific extensions, e.g. `.pdf`, `.mp4`, `.sketch` |
| `keyword` | Substring in the filename (case-sensitive or not) |
| `size` | Files larger or smaller than a threshold (e.g. `> 10 MB`) |
| `regex` | Full regex match against the filename |
| `dateGroup` | Groups files into date folders by `year`, `month`, or `quarter` |
| `dateRange` | Files created or modified within a date range |

Rules are evaluated in order — first match wins. Disabled rules are skipped.

---

## Configuration

Rules and last-used paths are stored in `~/.stow/config.json`. You can edit this file directly or manage everything through the UI.

To use a different port for the web server:

```bash
STOW_PORT=8080 stow
```

---

## Development

```bash
git clone https://github.com/h8ntome/Stow.git
cd Stow
npm install

# Run the web server (serves the pre-built client)
npm run dev:server

# Run the Vite dev server (hot-reload UI at localhost:5173)
npm run dev:client

# Build the client for production
npm run build:client
```

The React source is in `client/`. The Express server is in `src/web/`. Core logic (scanner, rules engine, mover) is in `src/core/`.

---

## License

MIT — see [LICENSE](LICENSE)
