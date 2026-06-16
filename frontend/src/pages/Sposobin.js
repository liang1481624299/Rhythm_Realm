// Sposobin 页面 - 直接渲染，不使用 iframe
import * as Tone from 'tone';
import '../sposobin.css';
import '../rhythm.css';
import { createScoreRenderer, renderScore } from '../components/ScoreRenderer.js';
import { createPianoPanel, updatePianoPanelVisibility } from '../components/PianoPanel.js';
import { createChordPanel, updateChordPanel } from '../components/ChordPanel.js';
import { createRhythmSelector } from '../components/RhythmSelector.js';
import { getRhythmDuration } from '../audio/player.js';
import { isDarkMode, toggleTheme } from '../lib/theme.js';

// 简化的 Store 实现
const store = {
  mode: 'FREE',
  key_name: 'C 大调 (C Major)',
  time_signature: '4/4',
  target_melody: [],
  history: [],
  pending_note: null,
  renderData: { sigs: [], nodes: [] },
  categories: { diatonic: {}, chromatic: {} },
  playbackIndex: null,
  currentRhythm: 'quarter',

  _subscribers: [],
  _isPlaying: false,
  _playbackTimeouts: [],

  subscribe(fn) {
    this._subscribers.push(fn);
    return () => {
      this._subscribers = this._subscribers.filter(s => s !== fn);
    };
  },

  notify() {
    this._subscribers.forEach(fn => fn(this));
  },

  async sync() {
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
          pending_note: this.pending_note
        })
      });
      const data = await res.json();
      Object.assign(this, data);
      this.notify();
    } catch (e) {
      console.error('Sync failed:', e);
    }
  },

  sendAction(chord) {
    this.syncBackend(chord);
  },

  async syncBackend(action_chord = null) {
    this.stopSequence();

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
          action_chord
        })
      });
      const data = await res.json();
      Object.assign(this, data);

      if (action_chord && this.history.length > 0) {
        const lastChord = this.history[this.history.length - 1];
        if (lastChord?.voices) {
          playSingleChord(lastChord.voices);
        }
      }

      this.notify();
    } catch (e) {
      console.error('Sync failed:', e);
    }
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
    this._playbackTimeouts.forEach(clearTimeout);
    this._playbackTimeouts = [];
    this.playbackIndex = null;
    this._isPlaying = false;
  }
};

// 音频播放 - 仅使用钢琴音色
let mainLimiter = null;
let globalSynth = null;

async function initAudioEngine() {
  if (!mainLimiter) mainLimiter = new Tone.Limiter(-1).toDestination();

  if (globalSynth) {
    globalSynth.dispose();
    globalSynth = null;
  }

  globalSynth = new Tone.Sampler({
    urls: {
      "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", "A2": "A2.mp3",
      "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3",
      "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", "A4": "A4.mp3",
      "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", "A5": "A5.mp3",
      "C6": "C6.mp3"
    },
    baseUrl: "/audio/salamander/",
    release: 1.5,
    volume: -2
  }).connect(mainLimiter);
  await Tone.loaded();
}

async function playSingleChord(voices) {
  await Tone.start();
  await initAudioEngine();
  await Tone.loaded();

  if (globalSynth) {
    globalSynth.release = 0.05;
    globalSynth.releaseAll();
    globalSynth.release = 1.5;
  }

  const notes = Object.values(voices).map(midi => Tone.Frequency(midi, 'midi').toNote());
  globalSynth.triggerAttack(notes);
}

// 调性选项
const KEY_OPTIONS = [
  'C 大调 (C Major)', 'G 大调 (G Major)', 'D 大调 (D Major)', 'A 大调 (A Major)',
  'E 大调 (E Major)', 'B 大调 (B Major)', 'F# 大调 (F# Major)', 'F 大调 (F Major)',
  'Bb 大调 (Bb Major)', 'Eb 大调 (Eb Major)', 'Ab 大调 (Ab Major)', 'Db 大调 (Db Major)',
  'a 小调 (a minor)', 'e 小调 (e minor)', 'b 小调 (b minor)', 'd 小调 (d minor)',
  'g 小调 (g minor)', 'c 小调 (c minor)', 'f 小调 (f minor)'
];

// 图标
const icons = {
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>`,
  moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>`,
  play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>`
};

// 渲染函数
export function renderSposobin({ container }) {
  container.innerHTML = `
    <div class="aurora-bg">
      <div class="aurora-blob aurora-blob-1"></div>
      <div class="aurora-blob aurora-blob-2"></div>
      <div class="aurora-blob aurora-blob-3"></div>
      <div class="aurora-blob aurora-blob-4"></div>
    </div>

    <header class="sposobin-header" id="sposobin-header"></header>
    <main class="sposobin-main" id="sposobin-main"></main>
  `;

  const headerEl = container.querySelector('#sposobin-header');
  const mainEl = container.querySelector('#sposobin-main');

  // 创建头部
  function renderHeader() {
    const isDark = isDarkMode();
    headerEl.innerHTML = `
      <div class="sposobin-header-inner">
        <div class="flex items-center gap-2">
          <a href="#/" class="home-btn" title="返回首页" data-nav>
            ${icons.home}
          </a>
          <h1 class="app-title">
            Sposobin Engine
            <span class="version-badge">V2.0</span>
          </h1>
        </div>

        <div class="seg-control desktop-only" id="mode-selector">
          <input type="radio" name="mode" id="mode-free" value="FREE" checked>
          <label for="mode-free">自由模式</label>

          <input type="radio" name="mode" id="mode-soprano" value="SOPRANO">
          <label for="mode-soprano">高音题</label>

          <input type="radio" name="mode" id="mode-bass" value="BASS">
          <label for="mode-bass">低音题</label>

          <input type="radio" name="mode" id="mode-compose" value="COMPOSE">
          <label for="mode-compose">旋律写作</label>
        </div>

        <button class="grading-btn desktop-only" id="grading-btn" title="拍照批改">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          <span>批改</span>
        </button>

        <div class="flex items-center gap-3">
          <select class="modern-select desktop-only" id="key-select">
            ${KEY_OPTIONS.map(k => `<option value="${k}">${k}</option>`).join('')}
          </select>

          <select class="modern-select desktop-only" id="timesig-select">
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
          </select>

          <button class="theme-toggle-btn" id="sposobin-theme-toggle" title="切换主题">
            ${isDark ? icons.sun : icons.moon}
          </button>
        </div>
      </div>
    `;

    // 绑定主题切换事件
    headerEl.querySelector('#sposobin-theme-toggle')?.addEventListener('click', () => {
      toggleTheme();
      renderHeader();
    });

    // 绑定模式切换事件
    headerEl.querySelector('#mode-selector')?.addEventListener('change', (e) => {
      if (e.target.name === 'mode') {
        store.mode = e.target.value;
        store.resetState();
      }
    });

    // 绑定调性切换事件
    headerEl.querySelector('#key-select')?.addEventListener('change', (e) => {
      store.key_name = e.target.value;
      store.resetState();
    });

    // 绑定拍号切换事件
    headerEl.querySelector('#timesig-select')?.addEventListener('change', (e) => {
      store.time_signature = e.target.value;
      store.resetState();
    });

    // 绑定批改按钮事件
    headerEl.querySelector('#grading-btn')?.addEventListener('click', () => {
      window.location.hash = '#/grading';
    });

    // 更新 UI 状态
    const modeInput = headerEl.querySelector(`#mode-${store.mode.toLowerCase()}`);
    if (modeInput) modeInput.checked = true;

    const keySelect = headerEl.querySelector('#key-select');
    if (keySelect) keySelect.value = store.key_name;

    const timesigSelect = headerEl.querySelector('#timesig-select');
    if (timesigSelect) timesigSelect.value = store.time_signature;
  }

  // 主内容
  mainEl.innerHTML = `
    <div id="piano-container"></div>
    <div id="score-container"></div>
    <div id="chord-container"></div>
    <div id="rhythm-container"></div>
  `;

  const pianoContainer = mainEl.querySelector('#piano-container');
  const scoreContainerEl = mainEl.querySelector('#score-container');
  const chordContainer = mainEl.querySelector('#chord-container');
  const rhythmContainer = mainEl.querySelector('#rhythm-container');

  pianoContainer.appendChild(createPianoPanel(store));
  scoreContainerEl.appendChild(createScoreRenderer(store));
  chordContainer.appendChild(createChordPanel(store));
  rhythmContainer.appendChild(createRhythmSelector(store));

  renderHeader();

  // 订阅更新
  store.subscribe(() => {
    renderScore(store);
    updateChordPanel(store);
    updatePianoPanelVisibility(store);
    renderHeader();
  });

  // 监听主题变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      renderHeader();
      store.notify();
    }
  });

  window.addEventListener('theme-changed', () => {
    renderHeader();
    store.notify();
  });

  // 初始化音频引擎
  initAudioEngine();

  // 初始同步
  store.sync();

  // 判断是否为休止符
  function isRest(item) {
    return item && item.rhythm && item.rhythm.isRest;
  }

  // 导出到全局（供其他组件使用）
  window.sposobinStore = store;
  window.sposobinAudio = {
    async togglePlay() {
      if (store.history.length === 0) return;

      if (store._isPlaying) {
        store.stopSequence();
        renderScore(store);
        return;
      }

      store.stopSequence();
      await Tone.start();
      await initAudioEngine();
      await Tone.loaded();

      store._isPlaying = true;
      const baseIntervalMs = 1000;
      let currentIndex = 0;

      function playStep() {
        if (!store._isPlaying || currentIndex >= store.history.length) {
          store.playbackIndex = null;
          store._isPlaying = false;
          renderScore(store);
          return;
        }

        store.playbackIndex = currentIndex;
        renderScore(store);

        const item = store.history[currentIndex];
        const rhythmKey = item.rhythm?.key || 'quarter';
        const duration = getRhythmDuration(rhythmKey);
        const currentIntervalMs = duration * baseIntervalMs;

        if (!isRest(item)) {
          const notes = Object.values(item.voices).map(midi => Tone.Frequency(midi, 'midi').toNote());

          if (globalSynth) {
            globalSynth.release = 0.05;
            globalSynth.releaseAll();
            globalSynth.release = Math.min(duration * 0.8, 1.5);
            globalSynth.triggerAttack(notes);
          }
        }

        currentIndex++;

        if (currentIndex >= store.history.length) {
          const tLast = setTimeout(() => {
            if (globalSynth) {
              globalSynth.releaseAll();
            }
            store.playbackIndex = null;
            store._isPlaying = false;
            renderScore(store);
          }, currentIntervalMs * 2.5);
          store._playbackTimeouts.push(tLast);
        } else {
          const tNext = setTimeout(playStep, currentIntervalMs);
          store._playbackTimeouts.push(tNext);
        }
      }

      playStep();
    }
  };

  window.sposobinAPI = {
    async exportMusicXML() {
      if (store.history.length === 0) {
        alert('没有可导出的和声序列');
        return;
      }

      try {
        const res = await fetch('/api/export_musicxml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: store.mode,
            key_name: store.key_name,
            time_signature: store.time_signature,
            target_melody: store.target_melody,
            history: store.history,
            pending_note: store.pending_note
          })
        });
        const data = await res.json();

        const blob = new Blob([data.xml], { type: 'application/vnd.recordare.musicxml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sposobin_${store.key_name.replace(/\s+/g, '_')}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('导出失败');
      }
    }
  };
}