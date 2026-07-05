// Computes the on-screen (x, y) pixel position of a given character offset
// inside a <textarea>, by rendering an invisible mirror <div> with identical
// styles and measuring where that character lands. This is the standard
// technique for showing "fake carets" over a plain textarea.

const MIRROR_PROPERTIES = [
  "boxSizing", "width", "height", "overflowX", "overflowY",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderStyle", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
  "fontSizeAdjust", "lineHeight", "fontFamily", "textAlign", "textTransform",
  "textIndent", "textDecoration", "letterSpacing", "wordSpacing", "tabSize",
  "whiteSpace", "wordWrap", "wordBreak",
];

let mirrorDiv = null;

function getMirror(textarea) {
  if (!mirrorDiv) {
    mirrorDiv = document.createElement("div");
    mirrorDiv.style.position = "absolute";
    mirrorDiv.style.visibility = "hidden";
    mirrorDiv.style.top = "0";
    mirrorDiv.style.left = "-9999px";
    mirrorDiv.style.whiteSpace = "pre-wrap";
    mirrorDiv.style.wordWrap = "break-word";
    document.body.appendChild(mirrorDiv);
  }
  const computed = window.getComputedStyle(textarea);
  MIRROR_PROPERTIES.forEach((prop) => {
    mirrorDiv.style[prop] = computed[prop];
  });
  mirrorDiv.style.width = `${textarea.clientWidth}px`;
  return mirrorDiv;
}

export function getCaretCoordinates(textarea, position) {
  const mirror = getMirror(textarea);
  const value = textarea.value;
  const before = value.slice(0, position);
  const after = value.slice(position) || ".";

  mirror.textContent = "";
  const beforeSpan = document.createElement("span");
  beforeSpan.textContent = before;
  const marker = document.createElement("span");
  marker.textContent = after[0];
  mirror.appendChild(beforeSpan);
  mirror.appendChild(marker);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  const height = marker.offsetHeight || parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;

  return { top, left, height };
}
