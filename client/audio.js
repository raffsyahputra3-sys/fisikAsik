export class AudioEngine {
  constructor() {
    this.context = null;
    this.enabled = localStorage.getItem("logicodix.audio") !== "off";
    this.master = null;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem("logicodix.audio", enabled ? "on" : "off");
    if (this.master) this.master.gain.value = enabled ? 0.22 : 0;
    if (enabled) this.ensure();
  }

  tone({ frequency = 440, endFrequency = null, duration = 0.12, type = "sine", gain = 0.15, delay = 0 }) {
    const context = this.ensure();
    if (!context || !this.enabled) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noise({ duration = 0.12, gain = 0.08, delay = 0, highpass = 500 }) {
    const context = this.ensure();
    if (!context || !this.enabled) return;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    envelope.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(context.currentTime + delay);
  }

  click() {
    this.tone({ frequency: 660, endFrequency: 880, duration: 0.05, type: "square", gain: 0.04 });
  }

  shoot() {
    this.tone({ frequency: 520, endFrequency: 170, duration: 0.09, type: "sawtooth", gain: 0.05 });
    this.noise({ duration: 0.045, gain: 0.025, highpass: 1200 });
  }

  hit() {
    this.tone({ frequency: 150, endFrequency: 70, duration: 0.08, type: "square", gain: 0.06 });
    this.noise({ duration: 0.06, gain: 0.035, highpass: 300 });
  }

  dash() {
    this.tone({ frequency: 260, endFrequency: 760, duration: 0.14, type: "triangle", gain: 0.06 });
  }

  shock() {
    this.tone({ frequency: 110, endFrequency: 42, duration: 0.28, type: "sine", gain: 0.12 });
    this.noise({ duration: 0.2, gain: 0.05, highpass: 160 });
  }

  super() {
    this.tone({ frequency: 320, endFrequency: 980, duration: 0.3, type: "triangle", gain: 0.12 });
    this.tone({ frequency: 480, endFrequency: 1400, duration: 0.26, type: "sine", gain: 0.07, delay: 0.04 });
  }

  /** Stinger ultimate: dentuman rendah + desis; `gain` mengikuti level efek. */
  stinger({ hz = 80, endHz = 45, ms = 600, noise = 0.06, gain = 1 } = {}) {
    const seconds = ms / 1000;
    this.tone({ frequency: hz, endFrequency: endHz, duration: seconds, type: "sine", gain: 0.2 * gain });
    this.tone({ frequency: hz * 2, endFrequency: endHz * 2, duration: seconds * 0.7, type: "triangle", gain: 0.06 * gain });
    this.noise({ duration: seconds * 0.6, gain: noise * gain, highpass: 220 });
  }

  clashStart() {
    this.tone({ frequency: 880, duration: 0.08, type: "square", gain: 0.07 });
    this.tone({ frequency: 660, duration: 0.08, type: "square", gain: 0.07, delay: 0.1 });
    this.tone({ frequency: 990, duration: 0.15, type: "square", gain: 0.07, delay: 0.2 });
  }

  correct() {
    this.tone({ frequency: 660, endFrequency: 880, duration: 0.12, type: "triangle", gain: 0.1 });
    this.tone({ frequency: 990, endFrequency: 1320, duration: 0.2, type: "triangle", gain: 0.09, delay: 0.1 });
  }

  wrong() {
    this.tone({ frequency: 190, endFrequency: 90, duration: 0.3, type: "sawtooth", gain: 0.08 });
  }

  death() {
    this.tone({ frequency: 260, endFrequency: 55, duration: 0.45, type: "sawtooth", gain: 0.09 });
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.22,
        type: "triangle",
        gain: 0.11,
        delay: index * 0.13,
      });
    });
  }

  defeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.26,
        type: "sawtooth",
        gain: 0.07,
        delay: index * 0.15,
      });
    });
  }

  countdown(last = false) {
    this.tone({
      frequency: last ? 880 : 520,
      endFrequency: last ? 1100 : 560,
      duration: last ? 0.22 : 0.1,
      type: "square",
      gain: 0.07,
    });
  }
}
