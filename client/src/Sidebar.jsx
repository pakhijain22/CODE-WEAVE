import React, { useEffect, useRef, useState } from "react";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12L20 4L14 20L11.5 13.5L4 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M11.5 13.5L20 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const RestoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 10C5 6 8.5 3.5 12.5 4C16.8 4.5 20 8 20 12C20 16.5 16.5 20 12 20C8.3 20 5.2 17.5 4.3 14"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 5.5V10H8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Sidebar({
  open,
  onClose,
  activeTab,
  setActiveTab,
  chatMessages,
  onSendChat,
  myName,
  history,
  onRestore,
  historyLabel,
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages, open, activeTab]);

  if (!open) return null;

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setDraft("");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}>
          Chat
        </button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
          History
        </button>
        <button className="sidebar-close icon-btn" onClick={onClose} aria-label="Close sidebar">
          ×
        </button>
      </div>

      {activeTab === "chat" ? (
        <>
          <div className="sidebar-list" ref={listRef}>
            {chatMessages.length === 0 && (
              <p className="sidebar-empty">No messages yet — say hi 👋</p>
            )}
            {chatMessages.map((m) => (
              <div key={m.id} className={`chat-message ${m.name === myName ? "own" : ""}`}>
                <span className="chat-avatar" style={{ backgroundColor: m.color }}>
                  {initials(m.name)}
                </span>
                <div className="chat-bubble-wrap">
                  <div className="chat-meta">
                    <span className="chat-author">{m.name}</span>
                    <span className="chat-time">{formatTime(m.timestamp)}</span>
                  </div>
                  <div className="chat-bubble">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Message the room…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />
            <button type="submit" className="icon-btn chat-send" aria-label="Send message">
              <SendIcon />
            </button>
          </form>
        </>
      ) : (
        <div className="sidebar-list">
          <p className="history-hint">Snapshots of the {historyLabel}, newest first. Click restore to bring back an older version for everyone.</p>
          {history.length === 0 && <p className="sidebar-empty">No history yet — keep editing.</p>}
          {[...history].reverse().map((h, i) => (
            <div key={`${h.timestamp}-${i}`} className="history-entry">
              <div className="history-entry-meta">
                <span className="history-author">{h.author}</span>
                <span className="history-time">{formatTime(h.timestamp)}</span>
              </div>
              <pre className="history-preview">{h.text.slice(0, 140) || "(empty)"}</pre>
              <button className="history-restore" onClick={() => onRestore(h.text)}>
                <RestoreIcon /> Restore this version
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
