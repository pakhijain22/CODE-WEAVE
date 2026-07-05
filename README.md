# Code Weave

A real-time collaborative workspace with two synced pages per room: a
**Document** (shared writing surface) and **Code** (a syntax-highlighted
code editor). Multiple people join the same room and see each other's edits
live, plus a list of who's currently connected.

**Stack:** React + Vite + CodeMirror 6 (frontend), Node/Express + Socket.io (backend).

## How it works

- The backend keeps each room's document text, code text, and selected
  language in memory, and broadcasts every change to all other clients in
  that room over a websocket.
- The frontend has a start screen where you either **create a new room**
  (gets a random ID) or **join an existing room by typing its ID**. Once
  inside, a tab switcher lets you flip between the Document page (plain
  shared text) and the Code page (CodeMirror editor with a language picker:
  JavaScript, Python, HTML, CSS).
- **Live cursors** — everyone in the room sees a colored, name-tagged cursor
  marker for where their collaborators are currently typing, on both the
  Document and Code pages.
- **Run / Preview** — on the Code page, JavaScript and Python can be
  executed directly in the browser (JavaScript runs in a sandboxed iframe;
  Python runs via [Pyodide](https://pyodide.org), loaded on first use — the
  first run takes a few seconds while it downloads). HTML renders live in a
  preview pane. CSS has no standalone output, so Run is disabled for it.
- **Chat sidebar** — a side panel (toggle via the chat icon in the top bar)
  for talking with the room without leaving the page. Chat history is kept
  per room and sent to anyone who joins.
- **Version history** — the same sidebar has a History tab showing periodic
  snapshots of the Document/Code with who made each change and when. Click
  "Restore this version" to roll everyone's view back to an older version.
- **Typing notifications** — a small toast appears ("Alex is typing in
  Code…") when a collaborator is actively editing, so you know when
  something's about to change.
- **Download** — the download icon in the top bar saves whichever page
  you're currently on (Document as `.txt`, Code with the right extension
  for the selected language) to your computer.
- Rooms are just an ID in the URL (`?room=abc123`) as well as something you
  can type in directly on the join screen. Share the URL, or just tell
  someone the room ID and have them paste it into "Join with room ID".

This is intentionally simple (last-write-wins on the whole text/code, not
character-level operational transforms), which keeps the code easy to read
and extend. Good enough for a handful of collaborators at a time.

## Project structure

```
collab-editor/
├── server/          # Express + Socket.io backend
│   ├── index.js
│   └── package.json
└── client/          # React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

## Running it locally

You'll need [Node.js](https://nodejs.org) (v18+) installed.

### 1. Start the backend

```bash
cd server
npm install
npm start
```

This runs the server on `http://localhost:4000`.

### 2. Start the frontend

In a new terminal:

```bash
cd client
npm install
npm run dev
```

This runs the frontend on `http://localhost:5173`.

### 3. Try it out

Open `http://localhost:5173` in two different browser tabs (or share the URL
with someone else on your network). Type in one tab and watch the text
appear in the other.

## Letting people join from anywhere on the internet

`localhost` only works on your own machine — if you send that link to
someone else, it points to *their* computer, not yours, so it won't load.
Two ways to fix this:

### Quick way: ngrok (good for testing, link changes each time)

1. Install [ngrok](https://ngrok.com/download) and sign up for a free account.
2. Start your backend as usual (`cd server && npm start`, port 4000).
3. In a new terminal, tunnel it: `ngrok http 4000`. Copy the `https://...ngrok-free.app` URL it gives you.
4. Create a file `client/.env` with:
   ```
   VITE_SERVER_URL=https://your-ngrok-url.ngrok-free.app
   ```
5. Restart the frontend (`npm run dev` in `client/`) and, in another terminal,
   also tunnel the frontend: `ngrok http 5173`.
6. Share the frontend's ngrok URL — that's the link people click to join.
   It'll keep working as long as both `ngrok` tunnels and your servers stay running.

### Proper way: deploy it (permanent link, no terminal needed once it's live)

1. **Backend** → deploy the `server/` folder to [Render](https://render.com) or [Railway](https://railway.app) (both have free tiers). Point it at `server/` as the root, build command `npm install`, start command `npm start`.
2. **Frontend** → deploy the `client/` folder to [Vercel](https://vercel.com) or [Netlify](https://netlify.com). Set the environment variable `VITE_SERVER_URL` to your deployed backend's URL (from step 1) before building.
3. Share the frontend's deployed URL — this one works permanently, no terminal or laptop needs to stay on.

## Configuration

If you deploy the backend somewhere other than `localhost:4000`, set the
frontend's server URL via an environment variable before building:

```bash
# client/.env
VITE_SERVER_URL=https://your-backend-url.com
```

## Deploying

- **Backend**: any Node host works (Render, Railway, Fly.io, a VPS, etc).
  Just run `npm install && npm start` in the `server/` folder. Make sure
  the `PORT` environment variable is respected (it already is).
- **Frontend**: build with `npm run build` inside `client/`, then serve the
  resulting `dist/` folder as a static site (Vercel, Netlify, Cloudflare
  Pages, etc). Set `VITE_SERVER_URL` to your deployed backend's URL first.

## Ideas for extending this

- Persist documents/code to a database instead of in-memory storage (so
  content survives a server restart).
- Switch from "broadcast full text" to a proper CRDT/OT library (e.g.
  Yjs or ShareDB) for true character-level concurrent editing without
  any risk of overwriting someone else's keystroke.
- Add more languages to the Code page (CodeMirror has official language
  packages for most popular languages — just install the relevant
  `@codemirror/lang-*` package and add it to the `LANGUAGES` map in
  `App.jsx`).
- Add authentication so rooms aren't open to anyone with the link/ID.
- Show a small "room not found — this will create a new room" hint when
  joining a room ID nobody else is currently in.
- Add a typing indicator, and/or a lightweight chat sidebar.
