import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";

export const setRemoteCursors = StateEffect.define();

class RemoteCursorWidget extends WidgetType {
  constructor(name, color) {
    super();
    this.name = name;
    this.color = color;
  }

  eq(other) {
    return other.name === this.name && other.color === this.color;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "remote-cursor";
    wrap.style.borderLeftColor = this.color;

    const label = document.createElement("span");
    label.className = "remote-cursor-label";
    label.style.backgroundColor = this.color;
    label.textContent = this.name;

    wrap.appendChild(label);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

export const remoteCursorsField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursors)) {
        const docLength = tr.state.doc.length;
        const ranges = effect.value
          .filter((c) => typeof c.position === "number")
          .map((c) => {
            const pos = Math.max(0, Math.min(c.position, docLength));
            return Decoration.widget({
              widget: new RemoteCursorWidget(c.name, c.color),
              side: 1,
            }).range(pos);
          })
          .sort((a, b) => a.from - b.from);
        deco = Decoration.set(ranges);
      }
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});
