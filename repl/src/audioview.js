import "./compiler"; // Node.prototype.compile
import { assert } from "./utils";
import workletUrl from "./worklet.js?worker&url";
import { MIDI, parseMidiMessage } from "./midi.js";

export class AudioView {
  async updateGraph(node) {
    const { src, audioThreadNodes } = node.compile();
    if (
      !this.midiInited &&
      audioThreadNodes.some((node) => node.startsWith("Midi"))
    ) {
      this.initMidi();
    }
    if (!this.audioIn && audioThreadNodes.some((node) => node === "AudioIn")) {
      await this.initAudioIn();
    }
    this.send({
      type: "NEW_UNIT",
      unit: { src, audioThreadNodes },
    });
  }

  async initAudioIn() {
    console.log("init audio input...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
    const inputNode = this.audioCtx.createMediaStreamSource(stream);
    inputNode.connect(this.audioWorklet);
  }
  initMidi() {
    console.log("init midi input...");
    this.midiInited = true;
    const midi = new MIDI();
    midi.on("midimessage", (_, message) => {
      const msg = parseMidiMessage(message);
      this.midiNoteOn(...msg);
    });
  }

  midiNoteOn(channel, note, velocity) {
    this.send({
      type: "NOTE_ON",
      channel,
      note,
      velocity,
    });
  }

  /**
   * Send a message to the audio thread (audio worket)
   */
  send(msg) {
    assert(msg instanceof Object);

    if (!this.audioWorklet) return;

    this.audioWorklet.port.postMessage(msg);
  }

  async init() {
    if (this.audioCtx) {
      return;
    }
    assert(!this.audioCtx);

    this.audioCtx = new AudioContext({
      latencyHint: "interactive",
      sampleRate: 44100,
    });
    await this.audioCtx.audioWorklet.addModule(workletUrl);
    this.audioWorklet = new AudioWorkletNode(
      this.audioCtx,
      "sample-generator",
      {
        outputChannelCount: [2],
      }
    );
    // Callback to receive messages from the audioworklet
    this.audioWorklet.port.onmessage = (msg) => {
      console.log("msg from worklet", msg);
    };
    this.audioWorklet.connect(this.audioCtx.destination);
  }

  get isRunning() {
    return !!this.audioCtx;
  }

  /**
   * Stop audio playback
   */
  stop() {
    assert(this.audioCtx);

    this.audioWorklet.disconnect();
    this.audioWorklet = null;

    this.audioCtx.close();
    this.audioCtx = null;
  }
}