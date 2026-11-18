const scores = {
  home: [57, 64, 67, 71, 64, 62, 55, 62, 67, 69, 65, 62],
  hub: [60, 67, 71, 74, 71, 67, 57, 64, 69, 72, 69, 64],
  battle: [45, 57, 52, 57, 48, 60, 55, 60, 43, 55, 50, 55]
};
const cues = {
  ui: [69], strike: [42, 38], pulse: [58, 48, 36], summon: [67, 72, 79],
  upgrade: [60, 64, 67, 72], victory: [60, 64, 67, 72, 76], defeat: [64, 60, 57, 52]
};

export class GameAudio {
  mode = 'home';
  index = 0;
  next = 0;

  constructor(settings) {
    this.settings = settings;
    const unlock = () => {
      if (!this.context) {
        const Audio = window.AudioContext ?? window.webkitAudioContext;
        if (!Audio) return;
        this.context = new Audio();
      }
      if (this.context.state !== 'running' && this.context.state !== 'closed') this.context.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.context?.state === 'running') this.context.suspend().catch(() => {});
    });
  }

  tone(note, start, length, volume, type = 'sine') {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + length);
  }

  cue(name) {
    if (this.context?.state !== 'running' || !cues[name] || this.settings.effects <= 0) return;
    const now = this.context.currentTime;
    cues[name].forEach((note, i) => this.tone(note, now + i * .09, .18, this.settings.effects * .11, name === 'strike' ? 'triangle' : 'sine'));
  }

  update(mode) {
    if (this.context?.state !== 'running' || document.hidden) return;
    if (mode !== this.mode) {
      this.mode = mode;
      this.index = 0;
      this.next = 0;
    }
    if (!scores[mode] || this.settings.music <= 0) return;
    const now = this.context.currentTime;
    if (now < this.next) return;
    const step = mode === 'battle' ? .32 : .56;
    const melody = scores[mode];
    this.tone(melody[this.index % melody.length], now, step * 1.65, this.settings.music * .10);
    if (this.index % 3 === 0) this.tone(melody[this.index % melody.length] - 12, now, step * 2.8, this.settings.music * .07);
    this.index += 1;
    this.next = now + step;
  }
}
