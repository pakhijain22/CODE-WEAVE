function formatArg(arg) {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

// Runs JavaScript in an isolated sandbox iframe so it can't touch the app's
// own window/DOM, and captures console output + the final expression value.
export function runJavaScript(code) {
  return new Promise((resolve) => {
    const logs = [];
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 0);
    };

    const win = iframe.contentWindow;

    win.__push = (type, args) => {
      logs.push({ type, text: args.map(formatArg).join(" ") });
    };

    const script = iframe.contentDocument.createElement("script");
    script.textContent = `
      window.console = {
        log: (...a) => window.__push("log", a),
        info: (...a) => window.__push("log", a),
        warn: (...a) => window.__push("warn", a),
        error: (...a) => window.__push("error", a),
      };
      window.onerror = function (msg) {
        window.__push("error", [String(msg)]);
        return true;
      };
      (async () => {
        try {
          const result = await (async () => { ${code} })();
          if (result !== undefined) window.__push("result", [result]);
        } catch (err) {
          window.__push("error", [err && err.stack ? err.stack : String(err)]);
        } finally {
          window.parent.postMessage({ __codeWeaveRunDone: true }, "*");
        }
      })();
    `;

    const onMessage = (e) => {
      if (e.data && e.data.__codeWeaveRunDone) {
        window.removeEventListener("message", onMessage);
        resolve(logs);
        cleanup();
      }
    };
    window.addEventListener("message", onMessage);

    // Safety timeout in case the code hangs (infinite loop protection is
    // limited in-browser, but this at least stops us waiting forever).
    setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(logs.length ? logs : [{ type: "error", text: "Timed out after 5s (possible infinite loop)" }]);
      cleanup();
    }, 5000);

    iframe.contentDocument.body.appendChild(script);
  });
}

// Lazily loads Pyodide (Python compiled to WebAssembly) from a CDN the
// first time someone runs Python, then reuses the same instance.
let pyodidePromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function getPyodide(onStatus) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Loading Python runtime…");
      await loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
      });
      return pyodide;
    })();
  }
  return pyodidePromise;
}

export async function runPython(code, onStatus) {
  const logs = [];
  try {
    const pyodide = await getPyodide(onStatus);
    onStatus?.(null);
    pyodide.setStdout({ batched: (s) => logs.push({ type: "log", text: s }) });
    pyodide.setStderr({ batched: (s) => logs.push({ type: "error", text: s }) });
    await pyodide.runPythonAsync(code);
  } catch (err) {
    logs.push({ type: "error", text: err && err.message ? err.message : String(err) });
  }
  return logs;
}
