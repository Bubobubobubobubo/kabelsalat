import { Decoration, ViewPlugin, WidgetType } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";

export const clamp = (num, min, max) => {
  [min, max] = [Math.min(min, max), Math.max(min, max)];
  return Math.min(Math.max(num, min), max);
};

class SliderWidget extends WidgetType {
  constructor({ value, view, from, to, min, max, step }) {
    super();
    this.min = min ?? 0;
    this.max = max ?? 1;
    this.step = step ?? 0;
    this.valueString = value;
    this.value = clamp(Number(value), this.min, this.max);
    this.view = view;
    this.id = from;
    this.from = from; // will be changed from the outside..
    this.to = to;
    this.render(this.value);
  }

  render(value) {
    if (!this.canvas) {
      return;
    }
    value = isNaN(value) ? 0 : value;
    value = clamp(value, this.min, this.max);
    value = (value - this.min) / (this.max - this.min);
    this.ctx.fillStyle = "#1c1917";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const color = "#0d9488"; //"#d97706";
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    const strokeWidth = 2;
    const paddingBottom = 2;
    this.ctx.strokeWidth = strokeWidth;
    this.ctx.fillRect(
      value * (this.canvas.width - strokeWidth),
      0,
      strokeWidth,
      this.canvas.height - paddingBottom
    );
    this.ctx.fillRect(
      0,
      this.canvas.height / 2 - strokeWidth / 2 - paddingBottom / 2,
      this.canvas.width,
      strokeWidth
    );
  }

  updateValue(value, e) {
    // console.log("updateValue", value);
    value = clamp(value, this.min, this.max);

    this.render(value);
    e?.stopPropagation();
    e?.stopImmediatePropagation();
    e?.preventDefault();
    window.postMessage({ type: "KABELSALAT_SET_CONTROL", value, id: this.id });
  }

  replaceNumber(value) {
    const from = this.from + 2; // skip "_("
    const to = from + this.valueString.length;
    this.valueString = Number(value).toFixed(2);
    let change = { from, to, insert: this.valueString };
    this.view.dispatch({ changes: change });
  }

  eq(other) {
    return false;
  }

  getValue(unipolar) {
    unipolar = clamp(unipolar, 0, 1);
    const scaled = unipolar * (this.max - this.min) + this.min;
    return scaled;
  }

  handleMouseMove(e) {
    if (this.mouseDown) {
      const canvasX = e.clientX - this.canvas.offsetLeft;
      const value = this.getValue(canvasX / this.canvas.width);
      this.updateValue(value, e);
      this.replaceNumber(value);
    }
  }
  handleMouseDown(e) {
    const canvasX = e.clientX - this.canvas.offsetLeft;
    const value = this.getValue(canvasX / this.canvas.width);
    this.mouseDown = true;
    this.updateValue(value, e);
    this.replaceNumber(value);
  }
  handleMouseUp(e) {
    this.mouseDown = false;
  }

  attachListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
  }
  detachListeners() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("mousemove", this.handleMouseMove);
  }

  toDOM() {
    let canvas = document.createElement("canvas");
    canvas.className = "ks-slider";
    canvas.width = 64;
    canvas.height = 16;
    canvas.style = [
      `height:${canvas.height}px`,
      `width:${canvas.width}px`,
      `display:inline`,
      `cursor:pointer`,
      `padding-bottom:0px`,
      `margin-right:-10px`,
      `z-index:100`,
      `position:relative`,
    ].join(";");
    const ctx = canvas.getContext("2d");
    this.ctx = ctx;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.canvas = canvas;
    this.attachListeners();
    // this.updateValue(this.value);
    this.render(this.value);
    return canvas;
  }

  ignoreEvent() {
    return false;
  }
  destroy() {
    this.detachListeners();
  }
}

export const addWidget = StateEffect.define({
  map: ({ from, to }, change) => {
    return { from: change.mapPos(from), to: change.mapPos(to) };
  },
});

export const updateWidgets = (view, widgets) => {
  view.dispatch({ effects: addWidget.of(widgets) });
};

export const sliderPlugin = ViewPlugin.fromClass(
  class {
    decorations; /* : DecorationSet */

    constructor(view /* : EditorView */) {
      // this.decorations = sliders(view);
      this.decorations = Decoration.set([]);
      this.view = view;
    }

    update(update /* : ViewUpdate */) {
      update.transactions.forEach((tr) => {
        if (tr.docChanged) {
          this.decorations = this.decorations.map(tr.changes);
          const iterator = this.decorations.iter();
          while (iterator.value) {
            iterator.value.widget.from = iterator.from;
            iterator.next();
          }
        }
        for (let e of tr.effects) {
          if (e.is(addWidget)) {
            const widgets = e.value.map(
              ({ from, to, value, min, max, step }) => {
                return Decoration.widget({
                  widget: new SliderWidget({
                    from,
                    value,
                    view: this.view,
                    from,
                    to,
                    min,
                    max,
                    step,
                  }),
                  side: 1,
                }).range(from);
              }
            );
            this.decorations = Decoration.set(widgets);
          }
        }
      });
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
