import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { getCaretCoordinates } from "./caretCoords";
import { remoteCursorsField, setRemoteCursors } from "./remoteCursors";
import { runJavaScript, runPython } from "./runCode";
import { downloadDocument, downloadCode } from "./downloadFile";
import Sidebar from "./Sidebar";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const LANGUAGES = {
  javascript: { label: "JavaScript", extension: javascript({ jsx: true }), runnable: "run" },
  python: { label: "Python", extension: python(), runnable: "run" },
  html: { label: "HTML", extension: html(), runnable: "preview" },
  css: { label: "CSS", extension: css(), runnable: false },
};

function getRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

async function copyToClipboard(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  if (!ok) throw new Error("Copy failed");
  return true;
}

// ---------- Icons ----------

const Logo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="url(#cw-grad)" />
    <path d="M12 9C9 11.5 9 20.5 12 23" stroke="#FFFAF6" strokeWidth="2.1" strokeLinecap="round" fill="none" />
    <path d="M20 9C23 11.5 23 20.5 20 23" stroke="#FFFAF6" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.55" />
    <path d="M14.2 19.5L17.8 12.5" stroke="#FFFAF6" strokeWidth="2.1" strokeLinecap="round" />
    <defs>
      <linearGradient id="cw-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EB9830" />
        <stop offset="1" stopColor="#574407" />
      </linearGradient>
    </defs>
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 2.5V5M12 19V21.5M4.2 4.2L6 6M18 18L19.8 19.8M2.5 12H5M19 12H21.5M4.2 19.8L6 18M18 6L19.8 4.2"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.5 14.5L14.5 9.5M8 16L6.3 17.7C4.9 19.1 2.7 19.1 1.3 17.7C-0.1 16.3 -0.1 14.1 1.3 12.7L4.5 9.5C5.9 8.1 8.1 8.1 9.5 9.5"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform="translate(2, 0)" />
    <path d="M14.5 9.5L16.2 7.8C17.6 6.4 19.8 6.4 21.2 7.8C22.6 9.2 22.6 11.4 21.2 12.8L18 16C16.6 17.4 14.4 17.4 13 16"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform="translate(-2, 0)" />
  </svg>
);

const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3.5H14.5L18.5 7.5V20.5H6V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14.2 3.5V7.8H18.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8.5 12H16M8.5 15.2H16M8.5 18.4H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const CodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 8L4.5 12L9 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 8L19.5 12L15 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.3 5.5L10.7 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 5.5L18.5 12L7 18.5V5.5Z" fill="currentColor" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 5.5H20V16H9L5 19.5V16H4V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4V15M12 15L7.5 10.5M12 15L16.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 17.5V19.5H19.5V17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------- App ----------

export default function App() {
  const [roomId, setRoomId] = useState(getRoomFromUrl());
  const [name, setName] = useState("");
  const [joinMode, setJoinMode] = useState(getRoomFromUrl() ? "join" : "create");
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [docText, setDocText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [activePage, setActivePage] = useState("document");
  const [users, setUsers] = useState([]);
  const [copyState, setCopyState] = useState("idle");
  const [theme, setTheme] = useState("dark");

  const [docCursors, setDocCursors] = useState({});
  const [codeCursors, setCodeCursors] = useState({});
  const [, forceOverlayUpdate] = useState(0);

  const [runOutput, setRunOutput] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [docHistory, setDocHistory] = useState([]);
  const [codeHistory, setCodeHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [typingToasts, setTypingToasts] = useState([]);

  const socketRef = useRef(null);
  const mySocketId = useRef(null);
  const textareaRef = useRef(null);
  const codeViewRef = useRef(null);
  const typingTimers = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const pushTypingToast = (toastName, page) => {
    const id = `${toastName}-${page}`;
    setTypingToasts((prev) => {
      const withoutExisting = prev.filter((t) => t.id !== id);
      return [...withoutExisting, { id, name: toastName, page }];
    });
    clearTimeout(typingTimers.current[id]);
    typingTimers.current[id] = setTimeout(() => {
      setTypingToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const connectToRoom = useCallback(
    (targetRoomId) => {
      const socket = io(SERVER_URL);
      socketRef.current = socket;

      socket.on("connect", () => {
        mySocketId.current = socket.id;
        socket.emit("join", { roomId: targetRoomId, name: name || "Anonymous" });
        setJoined(true);
        setConnected(true);
      });

      socket.on("disconnect", () => setConnected(false));
      socket.io.on("reconnect", () => setConnected(true));

      socket.on("init", (state) => {
        setDocText(state.docText || "");
        setCodeText(state.codeText || "");
        setLanguage(state.codeLanguage || "javascript");
        setChatMessages(state.chatMessages || []);
        setDocHistory(state.docHistory || []);
        setCodeHistory(state.codeHistory || []);
      });

      socket.on("doc-change", ({ text }) => setDocText(text));
      socket.on("code-change", ({ code }) => setCodeText(code));
      socket.on("language-change", ({ language: lang }) => setLanguage(lang));

      socket.on("doc-cursor", ({ id, position }) => {
        setDocCursors((prev) => ({ ...prev, [id]: position }));
      });
      socket.on("code-cursor", ({ id, position }) => {
        setCodeCursors((prev) => ({ ...prev, [id]: position }));
      });

      socket.on("chat-message", (message) => {
        setChatMessages((prev) => [...prev, message]);
      });

      socket.on("doc-history", (history) => setDocHistory(history));
      socket.on("code-history", (history) => setCodeHistory(history));

      socket.on("typing", ({ name: typingName, page }) => {
        pushTypingToast(typingName, page);
      });

      socket.on("users", (userList) => {
        setUsers(userList);
        const ids = new Set(userList.map((u) => u.id));
        setDocCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id))));
        setCodeCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id))));
      });
    },
    [name]
  );

  const handleCreate = (e) => {
    e.preventDefault();
    const newRoom = randomRoomId();
    setRoomId(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set("room", newRoom);
    window.history.replaceState({}, "", url);
    connectToRoom(newRoom);
  };

  const handleJoinById = (e) => {
    e.preventDefault();
    const target = joinRoomInput.trim();
    if (!target) return;
    setRoomId(target);
    const url = new URL(window.location.href);
    url.searchParams.set("room", target);
    window.history.replaceState({}, "", url);
    connectToRoom(target);
  };

  useEffect(() => {
    const fromUrl = getRoomFromUrl();
    if (fromUrl) setJoinRoomInput(fromUrl);
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // ---- Document page ----

  const handleDocChange = (e) => {
    const newText = e.target.value;
    setDocText(newText);
    socketRef.current?.emit("doc-change", { roomId, text: newText, author: name || "Anonymous" });
    socketRef.current?.emit("typing", { roomId, page: "document" });
  };

  const emitDocCursor = () => {
    const ta = textareaRef.current;
    if (!ta || !socketRef.current) return;
    socketRef.current.emit("doc-cursor", { roomId, position: ta.selectionStart });
  };

  const handleDocScroll = () => forceOverlayUpdate((n) => n + 1);

  useEffect(() => {
    const onResize = () => forceOverlayUpdate((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const otherUsers = users.filter((u) => u.id !== mySocketId.current);

  const restoreDoc = (text) => {
    setDocText(text);
    socketRef.current?.emit("doc-change", { roomId, text, author: name || "Anonymous" });
  };

  // ---- Code page ----

  const handleCodeChange = (value) => {
    setCodeText(value);
    socketRef.current?.emit("code-change", { roomId, code: value, author: name || "Anonymous" });
    socketRef.current?.emit("typing", { roomId, page: "code" });
  };

  const handleCodeUpdate = (viewUpdate) => {
    if (viewUpdate.selectionSet && socketRef.current) {
      const pos = viewUpdate.state.selection.main.head;
      socketRef.current.emit("code-cursor", { roomId, position: pos });
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setRunOutput(null);
    setPreviewHtml(null);
    socketRef.current?.emit("language-change", { roomId, language: lang });
  };

  useEffect(() => {
    if (!codeViewRef.current) return;
    const cursorsArray = otherUsers
      .filter((u) => codeCursors[u.id] !== undefined)
      .map((u) => ({ name: u.name, color: u.color, position: codeCursors[u.id] }));
    codeViewRef.current.dispatch({ effects: setRemoteCursors.of(cursorsArray) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeCursors, users]);

  const restoreCode = (text) => {
    setCodeText(text);
    socketRef.current?.emit("code-change", { roomId, code: text, author: name || "Anonymous" });
  };

  const handleRun = async () => {
    const meta = LANGUAGES[language];
    if (!meta.runnable) return;

    if (meta.runnable === "preview") {
      setPreviewHtml(codeText);
      setRunOutput(null);
      return;
    }

    setRunning(true);
    setPreviewHtml(null);
    setRunOutput([]);
    setRunStatus(null);

    let logs = [];
    if (language === "javascript") {
      logs = await runJavaScript(codeText);
    } else if (language === "python") {
      logs = await runPython(codeText, setRunStatus);
    }
    setRunOutput(logs);
    setRunning(false);
    setRunStatus(null);
  };

  const closeOutput = () => {
    setRunOutput(null);
    setPreviewHtml(null);
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    } finally {
      setTimeout(() => setCopyState("idle"), 2200);
    }
  };

  const handleDownload = () => {
    if (activePage === "document") {
      downloadDocument(docText, roomId);
    } else {
      downloadCode(codeText, language, roomId);
    }
  };

  const handleSendChat = (text) => {
    socketRef.current?.emit("chat-message", { roomId, text });
  };

  const openSidebar = (tab) => {
    setSidebarTab(tab);
    setSidebarOpen(true);
  };

  const wordCount = docText.trim() ? docText.trim().split(/\s+/).length : 0;
  const charCount = docText.length;
  const codeLines = codeText ? codeText.split("\n").length : 0;
  const langMeta = LANGUAGES[language];

  if (!joined) {
    return (
      <div className="join-screen">
        <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="join-card">
          <div className="join-logo">
            <Logo size={26} />
          </div>
          <h1>Code Weave</h1>
          <p className="subtitle">Write, code, and think together in real time.</p>

          <div className="mode-switch">
            <button className={joinMode === "create" ? "active" : ""} onClick={() => setJoinMode("create")} type="button">
              Create a room
            </button>
            <button className={joinMode === "join" ? "active" : ""} onClick={() => setJoinMode("join")} type="button">
              Join with room ID
            </button>
          </div>

          {joinMode === "create" ? (
            <form onSubmit={handleCreate}>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <button type="submit" className="primary-btn">Create room</button>
            </form>
          ) : (
            <form onSubmit={handleJoinById}>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <input
                type="text"
                placeholder="Room ID"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value)}
                autoFocus={!getRoomFromUrl()}
              />
              <button type="submit" className="primary-btn">Join room</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-logo"><Logo size={16} /></span>
          <span className="brand-name">Code Weave</span>
          <span className="divider" />
          <span className={`status-dot ${connected ? "online" : "offline"}`} />
          <span className="room-label">Room <code>{roomId}</code></span>
        </div>

        <nav className="page-tabs">
          <button className={activePage === "document" ? "active" : ""} onClick={() => setActivePage("document")}>
            <DocIcon /> Document
          </button>
          <button className={activePage === "code" ? "active" : ""} onClick={() => setActivePage("code")}>
            <CodeIcon /> Code
          </button>
        </nav>

        <div className="topbar-right">
          <button className="icon-btn" onClick={handleDownload} aria-label="Download" title="Download current page">
            <DownloadIcon />
          </button>

          <button
            className={`icon-btn ${sidebarOpen ? "active-icon" : ""}`}
            onClick={() => (sidebarOpen ? setSidebarOpen(false) : openSidebar("chat"))}
            aria-label="Toggle chat"
            title="Chat & history"
          >
            <ChatIcon />
          </button>

          <button onClick={handleCopyLink} className={`link-btn ${copyState !== "idle" ? copyState : ""}`}>
            <LinkIcon />
            <span>{copyState === "copied" ? "Link copied" : copyState === "failed" ? "Copy failed" : "Copy invite link"}</span>
          </button>

          <div className="users">
            {users.map((u) => (
              <span key={u.id} className="user-pill" style={{ backgroundColor: u.color }} title={u.name}>
                {initials(u.name)}
              </span>
            ))}
          </div>

          <span className="divider" />

          <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <div className="typing-toasts">
        {typingToasts.map((t) => (
          <div key={t.id} className="typing-toast">
            <strong>{t.name}</strong> is typing in {t.page === "document" ? "Document" : "Code"}…
          </div>
        ))}
      </div>

      <div className="workspace">
        <div className="workspace-main">
          {activePage === "document" ? (
            <>
              <main className="page-area">
                <div className="page doc-editor-wrap">
                  <textarea
                    ref={textareaRef}
                    className="editor"
                    value={docText}
                    onChange={handleDocChange}
                    onSelect={emitDocCursor}
                    onClick={emitDocCursor}
                    onKeyUp={emitDocCursor}
                    onScroll={handleDocScroll}
                    placeholder="Start typing — everyone in this room sees it live."
                    spellCheck={true}
                    dir="ltr"
                  />
                  <div className="doc-cursor-overlay">
                    {textareaRef.current &&
                      otherUsers
                        .filter((u) => docCursors[u.id] !== undefined)
                        .map((u) => {
                          const coords = getCaretCoordinates(textareaRef.current, docCursors[u.id]);
                          return (
                            <div
                              key={u.id}
                              className="doc-cursor-marker"
                              style={{ top: coords.top, left: coords.left, height: coords.height, backgroundColor: u.color }}
                            >
                              <span className="doc-cursor-label" style={{ backgroundColor: u.color }}>
                                {u.name}
                              </span>
                            </div>
                          );
                        })}
                  </div>
                </div>
              </main>
              <footer className="statusbar">
                <span>{wordCount} words</span>
                <span className="statusbar-sep">·</span>
                <span>{charCount} characters</span>
                <span className="statusbar-sep">·</span>
                <span>{users.length} {users.length === 1 ? "person" : "people"} online</span>
              </footer>
            </>
          ) : (
            <>
              <div className="code-toolbar">
                <select value={language} onChange={handleLanguageChange}>
                  {Object.entries(LANGUAGES).map(([key, lang]) => (
                    <option key={key} value={key}>{lang.label}</option>
                  ))}
                </select>

                <button
                  className="run-btn"
                  onClick={handleRun}
                  disabled={!langMeta.runnable || running}
                  title={!langMeta.runnable ? "CSS alone has nothing to render — try HTML" : undefined}
                >
                  <PlayIcon />
                  {running ? "Running…" : langMeta.runnable === "preview" ? "Preview" : "Run"}
                </button>
              </div>

              <div className="code-body">
                <div className="code-area">
                  <CodeMirror
                    value={codeText}
                    height="100%"
                    theme={theme === "dark" ? githubDark : githubLight}
                    extensions={[LANGUAGES[language].extension, remoteCursorsField]}
                    onChange={handleCodeChange}
                    onUpdate={handleCodeUpdate}
                    onCreateEditor={(view) => { codeViewRef.current = view; }}
                    basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
                    style={{ height: "100%", fontSize: "14px" }}
                  />
                </div>

                {(runOutput !== null || previewHtml !== null) && (
                  <div className="output-panel">
                    <div className="output-panel-header">
                      <span>{previewHtml !== null ? "Preview" : runStatus || "Output"}</span>
                      <button className="icon-btn" onClick={closeOutput} aria-label="Close output">
                        <CloseIcon />
                      </button>
                    </div>
                    {previewHtml !== null ? (
                      <iframe className="output-iframe" srcDoc={previewHtml} sandbox="allow-scripts" title="HTML preview" />
                    ) : (
                      <div className="output-panel-body">
                        {runOutput.length === 0 && !running && <span className="output-line muted">No output.</span>}
                        {runOutput.map((line, i) => (
                          <div key={i} className={`output-line ${line.type}`}>
                            {line.type === "error" ? "✕ " : line.type === "result" ? "→ " : ""}
                            {line.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <footer className="statusbar">
                <span>{langMeta.label}</span>
                <span className="statusbar-sep">·</span>
                <span>{codeLines} lines</span>
                <span className="statusbar-sep">·</span>
                <span>{users.length} {users.length === 1 ? "person" : "people"} online</span>
              </footer>
            </>
          )}
        </div>

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          chatMessages={chatMessages}
          onSendChat={handleSendChat}
          myName={name || "Anonymous"}
          history={activePage === "document" ? docHistory : codeHistory}
          onRestore={activePage === "document" ? restoreDoc : restoreCode}
          historyLabel={activePage === "document" ? "document" : "code"}
        />
      </div>
    </div>
  );
}
