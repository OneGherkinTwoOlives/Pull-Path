# Timeline Sticky Notes Web App

A lightweight web app for creating virtual sticky notes on a timeline board, with shared project and board persistence backed by Supabase.

## Features

- Create sticky notes and edit text directly on each note.
- Drag notes freely in two dimensions.
- Timeline axis across the board with dynamic date labels.
- Relationship mode: click two notes to draw a line between them.
- Remove all links or delete individual notes.
- Share projects and saved boards across devices through Supabase.

## Run

Open `index.html` in any modern browser.

## Supabase Setup

This app now expects the database schema in `supabase-setup.sql` to exist in your Supabase project.

1. Open the Supabase SQL editor for your project.
2. Run the contents of `supabase-setup.sql`.
3. Confirm `supabase-config.js` contains the correct project URL and anon key.

The current SQL policies are intentionally permissive so the GitHub Pages prototype can read and write shared data without a full auth redesign. That is suitable for a prototype, not for production.

If you prefer using a local server (recommended), run one of these commands from this folder:

### Python

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

### Node (if you have `npx`)

```bash
npx serve .
```

Then open the URL shown in the terminal.
