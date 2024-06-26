import { AudioView } from "./audioview.js";
import * as api from "./node.js";

export class SalatRepl {
  constructor({ onToggle } = {}) {
    this.audio = new AudioView();
    this.onToggle = onToggle;
    Object.assign(globalThis, api);
  }
  evaluate(code) {
    return api.evaluate(code);
  }
  async play(node) {
    if (!this.audio.isRunning) {
      await this.audio.init();
    }
    this.audio.updateGraph(node);
    this.onToggle?.(true);
  }
  stop() {
    this.audio.stop();
    this.onToggle?.(false);
  }
}
