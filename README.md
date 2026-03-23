# fox-ticket-tracker

Static ticket tracker built in the same visual style as `fox-time-tracker`.

## Features

- Create ticket entries with title, submitted date, completed date, status, and details
- Unique ticket ID validation across create, edit, and CSV import
- Rectangular ticket cards
- `In Progress` status uses yellow
- `Waiting For Approval` status uses orange
- `Completed` status uses green
- `Canceled` status uses grey
- Default sort order keeps `In Progress` tickets first, then newer submitted dates
- Details panel for reviewing and editing a ticket
- Notes / updates timeline per ticket
- Archive / restore support
- Search by ticket ID, title, details, and notes
- CSV import and export with the same round-trip format
- Shared repo-backed storage in [`data/tickets.json`](data/tickets.json) when served through the local server
- Browser `localStorage` fallback when the app is opened directly from the filesystem

## Usage

Run the local server for shared data across browsers:

```bash
node server.js
```

Then open `http://127.0.0.1:4173` in any browser on the same machine.

If you open `index.html` directly, the app still works, but saves only to that browser's local storage.
