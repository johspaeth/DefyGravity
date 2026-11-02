// Original procedural ambience and wooden taps. No recordings or paid APIs.
export class WorkshopAudio {
  enabled = true;
  context = null;
  elapsed = 0;
  beat = 0;
  lastKnock = -1;
  notes = [261.626, 329.628, 392.0, 293.665, 440.0, 392.0, 329.628, 293.665];

  async unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? .45 : 0;
      this.master.connect(this.context.destination);
      const length = this.context.sampleRate * .16;
      this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * .15));
    }
    if (this.enabled) await this.context.resume().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? .45 : 0, this.context.currentTime, .06);
    if (this.enabled) this.unlock();
    return this.enabled;
  }
  tone(frequency, duration, volume, start = 0, type = 'sine') {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const c = this.context, t = c.currentTime + start;
    const oscillator = c.createOscillator(), gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(t); oscillator.stop(t + duration + .03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  knock(intensity = .7) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (now - this.lastKnock < .045) return;
    this.lastKnock = now;
    const f = 470 + Math.random() * 230;
    this.tone(f, .11, .16 * intensity);
    this.tone(f * 2.7, .045, .035 * intensity);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = 1800;
    gain.gain.value = .07 * intensity;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  tick(dt) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    this.elapsed += dt;
    if (this.elapsed > 2.8) {
      this.elapsed %= 2.8;
      const note = this.notes[this.beat++ % this.notes.length];
      this.tone(note, 3.2, .019);
      this.tone(note / 2, 3.8, .014, .12);
      if (this.beat % 2 === 0) this.tone(note * 1.5, 2.6, .011, .7);
    }
  }
  dispose() { this.context?.close(); }
}
