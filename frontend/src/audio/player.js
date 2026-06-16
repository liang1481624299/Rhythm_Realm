import * as Tone from 'tone';

const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.02,
    decay: 0.1,
    sustain: 0.6,
    release: 2.0
  },
  volume: -8
}).toDestination();

export async function playChord(voices) {
  await Tone.start();
  const freqs = Object.values(voices).map(midi => Tone.Frequency(midi, "midi").toFrequency());
  synth.triggerAttackRelease(freqs, "2n");
}

export async function playSequence(historySequence) {
  await Tone.start();
  const now = Tone.now();
  const duration = 1.0;
  
  historySequence.forEach((item, index) => {
    const freqs = Object.values(item.voices).map(midi => Tone.Frequency(midi, "midi").toFrequency());
    synth.triggerAttackRelease(freqs, duration, now + index * duration);
  });
}

const RHYTHM_DURATIONS = {
  whole: 4.0,
  half: 2.0,
  quarter: 1.0,
  eighth: 0.5,
  sixteenth: 0.25,
  thirtySecond: 0.125,
  sixtyFourth: 0.0625,
  halfDot: 3.0,
  quarterDot: 1.5,
  eighthDot: 0.75,
  sixteenthDot: 0.375,
  thirtySecondDot: 0.1875,
  halfDoubleDot: 3.5,
  quarterDoubleDot: 1.75,
  eighthDoubleDot: 0.875,
  sixteenthDoubleDot: 0.4375,
  restWhole: 4.0,
  restHalf: 2.0,
  restQuarter: 1.0,
  restEighth: 0.5,
  restSixteenth: 0.25,
  restThirtySecond: 0.125,
};

export function getRhythmDuration(rhythmKey) {
  return RHYTHM_DURATIONS[rhythmKey] || 1.0;
}
