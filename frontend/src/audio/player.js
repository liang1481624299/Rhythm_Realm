import * as Tone from 'tone';

// 模拟你原版 player.py 中正弦波 + 高八度泛音的音色
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "custom",
    partials: [1, 0.5] // 基频权重 1，高八度（第二泛音）权重 0.5
  },
  envelope: {
    attack: 0.05,
    decay: 0.2,
    sustain: 0.8,
    release: 1.5
  },
  volume: -10 // 降低音量防止爆音
}).toDestination();

export async function playChord(voices) {
  await Tone.start(); // 浏览器要求必须由用户交互触发
  const freqs = Object.values(voices).map(midi => Tone.Frequency(midi, "midi").toFrequency());
  synth.triggerAttackRelease(freqs, "2n");
}

export async function playSequence(historySequence) {
  await Tone.start();
  const now = Tone.now();
  const duration = 1.0; // 每拍1秒 (BPM 60)
  
  historySequence.forEach((item, index) => {
    const freqs = Object.values(item.voices).map(midi => Tone.Frequency(midi, "midi").toFrequency());
    synth.triggerAttackRelease(freqs, duration, now + index * duration);
  });
}