# Code Weave ✎

**Write, code, and think together — in real time.**

We've all been there: your team's doc is in one tab, your code editor is in
another, and you're coordinating over WhatsApp in a third. So during a
hackathon, we got tired of tab-switching and built the thing we actually
wanted — one room where you can write, code, run it, and talk about it,
without ever leaving the page.
---
## What it actually does
Open the link, create a room (or join one with just a Room ID — no account
needed), and you're in. From there:
- **A shared Document** for writing together, live — think Google Docs, but
  lighter and built for this.
- **A shared Code editor** with real syntax highlighting for JavaScript,
  Python, HTML, and CSS.
- **Live cursors** — you can literally watch your teammate's cursor move
  around with their name floating next to it.
- **Run button** — JavaScript and Python actually execute, right in the
  browser. No backend, no setup, no "works on my machine."
- **A chat sidebar**, because sometimes you just need to say "wait, look at
  line 12" without switching apps.
- **Version history** — if someone accidentally deletes half the doc (it
  happens), you can roll it back in one click.
- **Typing indicators**, dark/light themes, and a room link you can just
  paste and send.

## Why we built it this way

We didn't want another tool that asks you to sign up, install an extension,
or set up a workspace before your friend can even join. So the whole thing
runs in the browser, rooms are just IDs, and code execution happens
client-side (JavaScript in a sandboxed iframe, Python via
[Pyodide](https://pyodide.org)) instead of on our server. That keeps the
backend tiny, cheap to run, and — importantly — it never touches anyone's
code.

## Under the hood

| | |
|---|---|
| **Frontend** | React + Vite, [CodeMirror 6](https://codemirror.net/) for the code editor |
| **Realtime** | Socket.io — every edit, cursor move, and chat message is a WebSocket event |
| **Backend** | Node.js + Express, in-memory room state (text, chat, history, cursors) |
| **Code execution** | Sandboxed iframe for JS, Pyodide (WebAssembly) for Python |

## Running it yourself

```bash
# backend
cd server
npm install
npm start        # runs on localhost:4000

# frontend (new terminal)
cd client
npm install
npm run dev       # runs on localhost:5173
```

Open two browser tabs on `localhost:5173`, join the same room, and you're
collaborating with yourself (which is a weirdly fun way to test it).

Want other people to join over the internet? See the deployment notes
further down — we run the frontend on Vercel and the backend on Render,
both free-tier friendly.

## The honest limitations

We built this fast, so a few things are still rough around the edges, on
purpose — we'd rather ship something real than polish something imaginary:

- Sync is "last write wins," not a true CRDT — great for a few people
  editing together, not built for hundreds at once.
- Rooms live in memory, so a server restart clears them. Fine for a demo,
  not yet for production.
- No auth or room passwords yet — anyone with the ID can join.

All of these are on the roadmap (see below) — we just didn't want to trade
a working demo for a perfect one.

## What's next

- Real CRDT-based sync (Yjs) so simultaneous edits never clash
- A database so rooms and history actually persist
- More languages on the Code page
- Optional room passwords / private rooms
- Maybe a lightweight AI assistant that can explain code or summarize the doc

## The team

Built by **[Team Name]** — [Member 1], [Member 2], and [Member 3] — over
[Hackathon Name].

If you poke around the code and find something confusing, broken, or just
want to say hi, open an issue. We'd genuinely love to hear about it.
