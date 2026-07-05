const EXTENSIONS = {
  javascript: "js",
  python: "py",
  html: "html",
  css: "css",
};

export function downloadDocument(text, roomId) {
  downloadBlob(text, `code-weave-${roomId}.txt`, "text/plain");
}

export function downloadCode(text, language, roomId) {
  const ext = EXTENSIONS[language] || "txt";
  downloadBlob(text, `code-weave-${roomId}.${ext}`, "text/plain");
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
