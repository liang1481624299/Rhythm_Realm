import { reactive } from 'vue';

export const SPOSOBIN_MODES = [
  { value: 'FREE', label: '自由模式', desc: '在已有和声进行上自由添加下一个和弦' },
  { value: 'SOPRANO', label: '高音题', desc: '给定高音旋律，为其配上低音声部和内声部' },
  { value: 'BASS', label: '低音题', desc: '给定低音旋律，为其配写高音声部与和声' },
  { value: 'COMPOSE', label: '旋律写作', desc: '为指定拍号、调式自由写作四部和声片段' }
];

export const SPOSOBIN_KEY_OPTIONS = [
  'C 大调 (C Major)', 'G 大调 (G Major)', 'D 大调 (D Major)', 'A 大调 (A Major)',
  'E 大调 (E Major)', 'B 大调 (B Major)', 'F# 大调 (F# Major)', 'F 大调 (F Major)',
  'Bb 大调 (Bb Major)', 'Eb 大调 (Eb Major)', 'Ab 大调 (Ab Major)', 'Db 大调 (Db Major)',
  'a 小调 (a minor)', 'e 小调 (e minor)', 'b 小调 (b minor)', 'd 小调 (d minor)',
  'g 小调 (g minor)', 'c 小调 (c minor)', 'f 小调 (f minor)'
];

export const SPOSOBIN_TIMESIG_OPTIONS = ['4/4', '3/4', '2/4'];

export const SPOSOBIN_AUDIO_MODES = [
  { value: 'sampler', label: '采样音 (钢琴/弦乐)' },
  { value: 'midi', label: '客户端 MIDI (内置合成器)' }
];

const _subscribers = [];

function _notify() {
  _subscribers.forEach(fn => fn(sposobinStore));
}

export const sposobinStore = reactive({
  mode: 'FREE',
  key_name: 'C 大调 (C Major)',
  time_signature: '4/4',
  target_melody: [],
  history: [],
  pending_note: null,
  renderData: { sigs: [], nodes: [] },
  categories: { diatonic: {}, chromatic: {} },
  playbackIndex: null,
  timbre: 'piano',
  audioMode: 'sampler',
  bpm: 100,
  isPlaying: false,
  playbackTimeouts: [],
  currentRhythm: 'quarter',

  subscribe(fn) {
    _subscribers.push(fn);
    return () => {
      const i = _subscribers.indexOf(fn);
      if (i >= 0) _subscribers.splice(i, 1);
    };
  },

  notify() {
    _notify();
  },

  async sync() {
    return this.syncBackend(null);
  },

  async syncBackend(actionChord = null) {
    this.stopSequence();

    // 备份现有历史记录中每个和弦的节奏属性
    const indexRhythmMap = {};
    this.history.forEach((item, idx) => {
      if (item.rhythm) {
        indexRhythmMap[idx] = { ...item.rhythm };
      }
    });

    try {
      const res = await fetch('/api/sync_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: this.mode,
          key_name: this.key_name,
          time_signature: this.time_signature,
          target_melody: this.target_melody,
          history: this.history,
          pending_note: this.pending_note,
          action_chord: actionChord
        })
      });
      const data = await res.json();

      // 恢复旧和弦的节奏，并为新和弦应用当前选中的节奏
      if (data && data.history) {
        const RHYTHM_DURATIONS = {
          whole: 4.0, half: 2.0, quarter: 1.0, eighth: 0.5, sixteenth: 0.25, thirtySecond: 0.125, sixtyFourth: 0.0625,
          halfDot: 3.0, quarterDot: 1.5, eighthDot: 0.75, sixteenthDot: 0.375, thirtySecondDot: 0.1875,
          halfDoubleDot: 3.5, quarterDoubleDot: 1.75, eighthDoubleDot: 0.875, sixteenthDoubleDot: 0.4375,
          restWhole: 4.0, restHalf: 2.0, restQuarter: 1.0, restEighth: 0.5, restSixteenth: 0.25, restThirtySecond: 0.125
        };

        data.history.forEach((item, idx) => {
          if (indexRhythmMap[idx]) {
            item.rhythm = indexRhythmMap[idx];
          } else if (idx === this.history.length && actionChord) {
            // 这是新添加的和弦，赋予当前选中的节奏
            const curKey = this.currentRhythm || 'quarter';
            item.rhythm = {
              key: curKey,
              duration: RHYTHM_DURATIONS[curKey] || 1.0,
              isRest: curKey.startsWith('rest')
            };
          }
        });
      }

      Object.assign(this, data);
      _notify();
      return data;
    } catch (e) {
      console.error('[sposobin] sync_state failed:', e);
      throw e;
    }
  },

  sendAction(chord) {
    return this.syncBackend(chord);
  },

  resetState() {
    this.stopSequence();
    this.history = [];
    this.target_melody = [];
    this.pending_note = null;
    this.playbackIndex = null;
    this.sync();
  },

  rewindTo(index) {
    this.stopSequence();
    this.history = this.history.slice(0, index + 1);
    this.pending_note = null;
    this.sync();
  },

  stopSequence() {
    this.playbackTimeouts.forEach(clearTimeout);
    this.playbackTimeouts = [];
    this.playbackIndex = null;
    this.isPlaying = false;
  }
});

export async function setSposobinMode(mode) {
  if (sposobinStore.mode === mode) return;
  sposobinStore.mode = mode;
  sposobinStore.resetState();
}

export async function setSposobinKey(keyName) {
  if (sposobinStore.key_name === keyName) return;
  sposobinStore.key_name = keyName;
  sposobinStore.resetState();
}

export async function setSposobinTimeSig(sig) {
  if (sposobinStore.time_signature === sig) return;
  sposobinStore.time_signature = sig;
  sposobinStore.resetState();
}

export async function setSposobinBpm(bpm) {
  const num = parseInt(bpm, 10);
  if (isNaN(num) || num < 40 || num > 300) return;
  sposobinStore.bpm = num;
}

export async function setSposobinAudioMode(mode) {
  if (sposobinStore.audioMode === mode) return;
  sposobinStore.audioMode = mode;
}

export function subscribeSposobin(fn) {
  return sposobinStore.subscribe(fn);
}

export function initSposobinStore() {
  if (!window.sposobinStore) {
    window.sposobinStore = sposobinStore;
  }
  return sposobinStore;
}