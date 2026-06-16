/**
 * SPOSOBIN 四部和声写作页面
 *
 * 注意：
 *   - 页面 Header 已由 App.vue 统一渲染（SposobinHeader），本文件不再渲染 header。
 *   - 全局状态（mode / key_name / time_signature 等）由 src/stores/sposobin.js 统一管理。
 *   - 极光背景由 App.vue 全局提供。
 */

import * as Tone from 'tone';
import '../sposobin.css';
import '../rhythm.css';
import { createScoreRenderer, renderScore } from '../components/ScoreRenderer.js';
import { createPianoPanel, updatePianoPanelVisibility } from '../components/PianoPanel.js';
import { createChordPanel, updateChordPanel } from '../components/ChordPanel.js';
import { createRhythmSelector } from '../components/RhythmSelector.js';
import { getRhythmDuration } from '../audio/player.js';
import { sposobinStore, subscribeSposobin, initSposobinStore } from '../stores/sposobin.js';

const store = sposobinStore;

// ===================== 音频引擎 =====================

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

// ===================== 页面渲染入口 =====================

function isRest(item) {
  return item && item.rhythm && item.rhythm.isRest;
}

/**
 * 由 router 调用
 */
export function renderSposobin({ container }) {
  container.innerHTML = `
    <div class="sposobin-container">
      <main class="sposobin-main">
        <div id="piano-container"></div>
        <div id="score-container"></div>
        <div id="chord-container"></div>
        <div id="rhythm-container"></div>
      </main>
    </div>
  `;

  const pianoContainer = container.querySelector('#piano-container');
  const scoreContainerEl = container.querySelector('#score-container');
  const chordContainer = container.querySelector('#chord-container');
  const rhythmContainer = container.querySelector('#rhythm-container');

  pianoContainer.appendChild(createPianoPanel(sposobinStore));
  scoreContainerEl.appendChild(createScoreRenderer(sposobinStore));
  chordContainer.appendChild(createChordPanel(sposobinStore));
  rhythmContainer.appendChild(createRhythmSelector(sposobinStore));

  // 订阅：状态变化时重绘五线谱 / 和弦 / 钢琴 / 节奏
  const unsubscribe = subscribeSposobin(() => {
    renderScore(sposobinStore);
    updateChordPanel(sposobinStore);
    updatePianoPanelVisibility(sposobinStore);
  });

  // 监听主题变化，重新渲染五线谱
  const onThemeChange = () => {
    renderScore(sposobinStore);
  };
  window.addEventListener('theme-changed', onThemeChange);

  container._sposobinCleanup = () => {
    unsubscribe();
    window.removeEventListener('sposobin:open-grading', onOpenGrading);
    window.removeEventListener('sposobin:play-chord', onPlayChord);
    window.removeEventListener('theme-changed', onThemeChange);
  };

  // 初始化音频引擎
  initAudioEngine();

  // 首次拉取后端状态
  sposobinStore.sync().catch(console.error);

  // 监听 SposobinHeader 上的「批改」按钮事件
  const onOpenGrading = () => {
    window.location.hash = '#/grading';
  };
  window.addEventListener('sposobin:open-grading', onOpenGrading);

  // 监听播放和弦事件
  const onPlayChord = () => {
    if (sposobinStore.history.length > 0) {
      const lastChord = sposobinStore.history[sposobinStore.history.length - 1];
      if (lastChord?.voices) {
        playSingleChord(lastChord.voices);
      }
    }
  };
  window.addEventListener('sposobin:play-chord', onPlayChord);

  const prevCleanup = container._sposobinCleanup;
  container._sposobinCleanup = () => {
    prevCleanup && prevCleanup();
    window.removeEventListener('sposobin:open-grading', onOpenGrading);
    window.removeEventListener('sposobin:play-chord', onPlayChord);
    window.removeEventListener('theme-changed', onThemeChange);
  };

  // —— 暴露到 window 供外部使用 ——
  window.sposobinStore = sposobinStore;
  window.sposobinAudio = {
    async togglePlay() {
      if (sposobinStore.history.length === 0) return;

      if (sposobinStore.isPlaying) {
        sposobinStore.stopSequence();
        renderScore(sposobinStore);
        return;
      }

      sposobinStore.stopSequence();
      await Tone.start();
      await initAudioEngine();
      await Tone.loaded();

      sposobinStore.isPlaying = true;
      const baseIntervalMs = 1000;
      let currentIndex = 0;

      function playStep() {
        if (!sposobinStore.isPlaying || currentIndex >= sposobinStore.history.length) {
          sposobinStore.playbackIndex = null;
          sposobinStore.isPlaying = false;
          renderScore(sposobinStore);
          return;
        }

        sposobinStore.playbackIndex = currentIndex;
        renderScore(sposobinStore);

        const item = sposobinStore.history[currentIndex];
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

        if (currentIndex >= sposobinStore.history.length) {
          const tLast = setTimeout(() => {
            if (globalSynth) {
              globalSynth.releaseAll();
            }
            sposobinStore.playbackIndex = null;
            sposobinStore.isPlaying = false;
            renderScore(sposobinStore);
          }, currentIntervalMs * 2.5);
          sposobinStore.playbackTimeouts.push(tLast);
        } else {
          const tNext = setTimeout(playStep, currentIntervalMs);
          sposobinStore.playbackTimeouts.push(tNext);
        }
      }

      playStep();
    }
  };

  window.sposobinAPI = {
    async exportMusicXML() {
      if (sposobinStore.history.length === 0) {
        alert('没有可导出的和声序列');
        return;
      }

      try {
        const res = await fetch('/api/export_musicxml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: sposobinStore.mode,
            key_name: sposobinStore.key_name,
            time_signature: sposobinStore.time_signature,
            target_melody: sposobinStore.target_melody,
            history: sposobinStore.history,
            pending_note: sposobinStore.pending_note
          })
        });
        const data = await res.json();

        const blob = new Blob([data.xml], { type: 'application/vnd.recordare.musicxml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sposobin_${sposobinStore.key_name.replace(/\s+/g, '_')}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('导出失败');
      }
    },

    async exportMIDI() {
      if (sposobinStore.history.length === 0) {
        alert('没有可导出的和声序列');
        return;
      }

      try {
        const res = await fetch('/api/export_midi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: sposobinStore.mode,
            key_name: sposobinStore.key_name,
            time_signature: sposobinStore.time_signature,
            target_melody: sposobinStore.target_melody,
            history: sposobinStore.history,
            pending_note: sposobinStore.pending_note,
            bpm: sposobinStore.bpm
          })
        });
        const data = await res.json();

        const blob = new Blob([data.midi], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sposobin_${sposobinStore.key_name.replace(/\s+/g, '_')}.mid`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('导出 MIDI 失败');
      }
    }
  };
}
