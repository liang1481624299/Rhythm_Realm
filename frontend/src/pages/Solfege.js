import { isDarkMode, toggleTheme } from '../lib/theme.js';
import { gsap } from 'gsap';

const API_BASE = 'http://localhost:8002/api';

const icons = {
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
  play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`,
  ear: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1 3.07-8.67A2 2 0 0 1 6.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 18 16.92z"></path>
  </svg>`,
  piano: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
    <line x1="6" y1="4" x2="6" y2="14"></line>
    <line x1="10" y1="4" x2="10" y2="14"></line>
    <line x1="14" y1="4" x2="14" y2="14"></line>
    <line x1="18" y1="4" x2="18" y2="14"></line>
  </svg>`,
  music: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>`,
  clock: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>`,
  drum: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="8" y1="12" x2="16" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="16"></line>
  </svg>`,
  refresh: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>`,
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>`
};

let currentExercise = null;
let score = 0;
let totalQuestions = 0;
let currentQuestion = null;
let sessionId = null;

async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  return response.json();
}

async function apiPost(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

export function renderSolfege({ container }) {
  container.innerHTML = `
    <div class="aurora-bg">
      <div class="aurora-blob aurora-blob-1"></div>
      <div class="aurora-blob aurora-blob-2"></div>
      <div class="aurora-blob aurora-blob-3"></div>
      <div class="aurora-blob aurora-blob-4"></div>
    </div>

    <header class="solfege-header" id="solfege-header"></header>
    <main class="solfege-main" id="solfege-main"></main>
  `;

  const headerEl = container.querySelector('#solfege-header');
  const mainEl = container.querySelector('#solfege-main');

  function renderHeader(showBack = false) {
    const isDark = isDarkMode();
    headerEl.innerHTML = `
      <div class="solfege-header-inner">
        <button class="theme-toggle-btn" id="solfege-theme-toggle" title="切换主题">
          ${isDark ? icons.sun : icons.moon}
        </button>
      </div>
    `;

    headerEl.querySelector('#solfege-theme-toggle')?.addEventListener('click', () => {
      toggleTheme();
      renderHeader(showBack);
    });
  }

  async function renderHome() {
    try {
      const result = await apiGet('/exercises');
      const exerciseTypes = result.exercises || [
        { id: 'harmonic_interval', name: '和声音程', description: '听辨和声音程，选择正确的音程名称', color: 'cyan' },
        { id: 'melodic_interval', name: '旋律音程', description: '听辨旋律音程，选择正确的音程名称', color: 'purple' },
        { id: 'chord', name: '和弦训练', description: '听辨和弦，选择正确的和弦类型', color: 'pink' },
        { id: 'identify_tone', name: '听音训练', description: '听辨单音，选择正确的音名', color: 'blue' }
      ];

      renderHeader(false);
      renderHomeContent(exerciseTypes);
    } catch (error) {
      console.error('Failed to load exercises:', error);
      renderHeader(false);
      renderHomeWithFallback();
    }
  }

  function renderHomeContent(exerciseTypes) {
    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card intro-card" style="padding: 1.5rem;">
          <div class="home-info-inner" style="align-items: center; padding: 0 0 1rem 0; border-bottom: 1px solid var(--glass-border);">
            <div class="home-info-icon aurora-gradient text-white" style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-md);">
              ${icons.ear}
            </div>
            <div>
              <h2 class="home-info-title" style="font-size: 1.5rem; font-family: var(--font-display);">视唱练耳</h2>
              <p class="home-info-desc" style="margin-top: 0.15rem;">Solfege Training</p>
            </div>
          </div>
          <p class="home-info-desc" style="font-size: 0.95rem; margin-top: 1rem; margin-bottom: 1.5rem; line-height: 1.6;">
            通过科学的训练方法，系统提升您的音乐听觉能力。从音程识别到节奏训练，
            逐步培养精准的音乐感知力和表达能力。
          </p>
          
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-value aurora-text">4</div>
              <div class="stat-label">训练模块</div>
            </div>
            <div class="stat-item">
              <div class="stat-value aurora-text">16+</div>
              <div class="stat-label">音程类型</div>
            </div>
            <div class="stat-item">
              <div class="stat-value aurora-text">8</div>
              <div class="stat-label">和弦类型</div>
            </div>
          </div>
        </div>

        <h3 class="section-title">选择训练类型</h3>
        <div class="exercise-grid">
          ${exerciseTypes.map(e => exerciseCard(e)).join('')}
        </div>
      </div>
    `;

    bindExerciseClick();
  }

  function renderHomeWithFallback() {
    const exerciseTypes = [
      { id: 'harmonic_interval', name: '和声音程', description: '听辨和声音程，选择正确的音程名称', color: 'cyan' },
      { id: 'melodic_interval', name: '旋律音程', description: '听辨旋律音程，选择正确的音程名称', color: 'purple' },
      { id: 'chord', name: '和弦训练', description: '听辨和弦，选择正确的和弦类型', color: 'pink' },
      { id: 'identify_tone', name: '听音训练', description: '听辨单音，选择正确的音名', color: 'blue' },
      { id: 'rhythm', name: '节奏训练', description: '听辨节奏，选择正确的节奏型', color: 'orange' }
    ];

    renderHomeContent(exerciseTypes);
  }

  function exerciseCard(exercise) {
    const colorMap = {
      cyan: 'card-cyan',
      purple: 'card-purple',
      pink: 'card-pink',
      blue: 'card-blue',
      orange: 'card-orange',
      green: 'card-green'
    };

    const iconMap = {
      harmonic_interval: icons.ear,
      melodic_interval: icons.music,
      chord: icons.piano,
      identify_tone: icons.clock,
      rhythm: icons.drum,
      interval: icons.ear,
      melody: icons.music
    };

    const colorClass = colorMap[exercise.color] || 'card-cyan';

    return `
      <div class="glass-card ${colorClass} exercise-card" data-exercise="${exercise.id}">
        <div class="feature-icon-bullet" style="display: grid; place-items: center; color: white;">
          ${iconMap[exercise.id] || icons.ear}
        </div>
        <h4 class="feature-card-title">${exercise.name || exercise.title}</h4>
        <p class="feature-card-desc">${exercise.description || exercise.desc}</p>
      </div>
    `;
  }

  function bindExerciseClick() {
    mainEl.querySelectorAll('[data-exercise]').forEach(card => {
      card.addEventListener('click', () => {
        const exerciseId = card.dataset.exercise;
        currentExercise = { id: exerciseId };
        renderExercise(exerciseId);
      });
    });
  }

  async function renderExercise(type) {
    score = 0;
    totalQuestions = 0;
    sessionId = null;

    try {
      const sessionResult = await apiPost('/session/create', { exercise_type: type });
      sessionId = sessionResult.session.session_id;
    } catch (error) {
      console.error('Failed to create session:', error);
    }

    renderHeader(false);

    if (type === 'harmonic_interval' || type === 'melodic_interval') {
      await renderIntervalExercise(type);
    } else if (type === 'chord') {
      await renderChordExercise();
    } else if (type === 'identify_tone') {
      await renderToneExercise();
    } else if (type === 'melody') {
      renderMelodyExercise();
    } else if (type === 'rhythm') {
      renderRhythmExercise();
    }
  }

  async function renderIntervalExercise(type) {
    let intervals = [];
    try {
      const result = await apiGet('/intervals');
      intervals = result.intervals;
    } catch (error) {
      console.error('Failed to load intervals:', error);
      intervals = [
        { name: '纯一度', abbr: 'P1', semitones: 0 },
        { name: '小二度', abbr: 'm2', semitones: 1 },
        { name: '大二度', abbr: 'M2', semitones: 2 },
        { name: '小三度', abbr: 'm3', semitones: 3 },
        { name: '大三度', abbr: 'M3', semitones: 4 },
        { name: '纯四度', abbr: 'P4', semitones: 5 },
        { name: '增四度', abbr: 'TT', semitones: 6 },
        { name: '纯五度', abbr: 'P5', semitones: 7 },
        { name: '小六度', abbr: 'm6', semitones: 8 },
        { name: '大六度', abbr: 'M6', semitones: 9 },
        { name: '小七度', abbr: 'm7', semitones: 10 },
        { name: '大七度', abbr: 'M7', semitones: 11 },
        { name: '纯八度', abbr: 'P8', semitones: 12 },
        { name: '小九度', abbr: 'm9', semitones: 13 },
        { name: '大九度', abbr: 'M9', semitones: 14 },
        { name: '小十度', abbr: 'm10', semitones: 15 },
        { name: '大十度', abbr: 'M10', semitones: 16 }
      ];
    }

    const isHarmonic = type === 'harmonic_interval';

    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card exercise-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="section-title" style="margin: 0 0 0.25rem 0;">${isHarmonic ? '和声音程' : '旋律音程'}</h3>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">听辨${isHarmonic ? '和声' : '旋律'}音程，选择正确的音程名称</p>
            </div>
            <button class="back-btn" id="interval-back-btn" title="返回首页">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="glass-card stats-card">
          <div class="stat">
            <span class="stat-label">得分</span>
            <span class="stat-value aurora-text">${score}</span>
          </div>
          <div class="stat">
            <span class="stat-label">题目</span>
            <span class="stat-value">${totalQuestions}</span>
          </div>
          <div class="stat">
            <span class="stat-label">正确率</span>
            <span class="stat-value">${totalQuestions > 0 ? Math.round(score / totalQuestions * 100) : 0}%</span>
          </div>
        </div>

        <div class="glass-card" style="text-align: center; padding: 1.5rem 1rem;">
          <button class="play-btn-circle" id="play-interval" title="播放音程">
            ${icons.play}
          </button>
          <div class="feedback" id="interval-feedback" style="margin-top: 0.5rem; font-size: 0.95rem; font-weight: 700; min-height: 1.5rem;"></div>
        </div>

        <div class="glass-card" style="padding: 1.5rem;">
          <div class="choice-grid">
            ${intervals.map(i => `
              <button class="choice-btn" data-interval="${i.abbr}">
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-title);">${i.abbr}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${i.name}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    await generateQuestion(type);

    mainEl.querySelector('#play-interval')?.addEventListener('click', () => playInterval(isHarmonic));
    mainEl.querySelector('#interval-back-btn')?.addEventListener('click', () => renderHome());
    mainEl.querySelectorAll('[data-interval]').forEach(btn => {
      btn.addEventListener('click', () => checkIntervalAnswer(btn.dataset.interval, type));
    });
  }

  async function renderChordExercise() {
    let chords = [];
    try {
      const result = await apiGet('/chords');
      chords = result.chords;
    } catch (error) {
      console.error('Failed to load chords:', error);
      chords = [
        { name: '大三和弦', abbr: 'M', notes: [0, 4, 7] },
        { name: '小三和弦', abbr: 'm', notes: [0, 3, 7] },
        { name: '增三和弦', abbr: 'aug', notes: [0, 4, 8] },
        { name: '减三和弦', abbr: 'dim', notes: [0, 3, 6] },
        { name: '大七和弦', abbr: 'M7', notes: [0, 4, 7, 11] },
        { name: '属七和弦', abbr: '7', notes: [0, 4, 7, 10] },
        { name: '小七和弦', abbr: 'm7', notes: [0, 3, 7, 10] },
        { name: '半减七和弦', abbr: 'm7♭5', notes: [0, 3, 6, 10] }
      ];
    }

    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card exercise-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="section-title" style="margin: 0 0 0.25rem 0;">和弦训练</h3>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">听辨和弦，选择正确的和弦类型</p>
            </div>
            <button class="back-btn" id="chord-back-btn" title="返回首页">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="glass-card stats-card">
          <div class="stat">
            <span class="stat-label">得分</span>
            <span class="stat-value aurora-text">${score}</span>
          </div>
          <div class="stat">
            <span class="stat-label">题目</span>
            <span class="stat-value">${totalQuestions}</span>
          </div>
          <div class="stat">
            <span class="stat-label">正确率</span>
            <span class="stat-value">${totalQuestions > 0 ? Math.round(score / totalQuestions * 100) : 0}%</span>
          </div>
        </div>

        <div class="glass-card" style="text-align: center; padding: 1.5rem 1rem;">
          <button class="play-btn-circle" id="play-chord" title="播放和弦">
            ${icons.play}
          </button>
          <div class="feedback" id="chord-feedback" style="margin-top: 0.5rem; font-size: 0.95rem; font-weight: 700; min-height: 1.5rem;"></div>
        </div>

        <div class="glass-card" style="padding: 1.5rem;">
          <div class="choice-grid">
            ${chords.map(c => `
              <button class="choice-btn" data-chord="${c.abbr}">
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-title);">${c.abbr}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${c.name}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    await generateQuestion('chord');

    mainEl.querySelector('#play-chord')?.addEventListener('click', playChord);
    mainEl.querySelector('#chord-back-btn')?.addEventListener('click', () => renderHome());
    mainEl.querySelectorAll('[data-chord]').forEach(btn => {
      btn.addEventListener('click', () => checkChordAnswer(btn.dataset.chord));
    });
  }

  async function renderToneExercise() {
    const notenames = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'b'];
    const notenamesCN = ['C', 'C# / D♭', 'D', 'D# / E♭', 'E', 'F', 'F# / G♭', 'G', 'G# / A♭', 'A', 'A# / B♭', 'B'];

    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card exercise-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="section-title" style="margin: 0 0 0.25rem 0;">听音训练</h3>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">听辨单音，选择正确的音名</p>
            </div>
            <button class="back-btn" id="tone-back-btn" title="返回首页">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="glass-card stats-card">
          <div class="stat">
            <span class="stat-label">得分</span>
            <span class="stat-value aurora-text">${score}</span>
          </div>
          <div class="stat">
            <span class="stat-label">题目</span>
            <span class="stat-value">${totalQuestions}</span>
          </div>
          <div class="stat">
            <span class="stat-label">正确率</span>
            <span class="stat-value">${totalQuestions > 0 ? Math.round(score / totalQuestions * 100) : 0}%</span>
          </div>
        </div>

        <div class="glass-card" style="text-align: center; padding: 1.5rem 1rem;">
          <button class="play-btn-circle" id="play-tone" title="播放单音">
            ${icons.play}
          </button>
          <div class="feedback" id="tone-feedback" style="margin-top: 0.5rem; font-size: 0.95rem; font-weight: 700; min-height: 1.5rem;"></div>
        </div>

        <div class="glass-card" style="padding: 1.5rem;">
          <div class="choice-grid">
            ${notenames.map((n, i) => `
              <button class="choice-btn" data-tone="${n}">
                <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-title);">${notenamesCN[i]}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    await generateQuestion('identify_tone');

    mainEl.querySelector('#play-tone')?.addEventListener('click', playTone);
    mainEl.querySelector('#tone-back-btn')?.addEventListener('click', () => renderHome());
    mainEl.querySelectorAll('[data-tone]').forEach(btn => {
      btn.addEventListener('click', () => checkToneAnswer(btn.dataset.tone));
    });
  }

  function renderMelodyExercise() {
    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card exercise-header">
          <h3 class="section-title" style="margin: 0 0 0.25rem 0;">旋律训练</h3>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">旋律训练功能开发中...</p>
        </div>

        <div class="glass-card empty-state">
          <div class="text-6xl mb-4">🎵</div>
          <p style="color: var(--text-muted); font-size: 0.9rem;">该功能正在全力开发中</p>
          <button class="btn-secondary" style="margin-top: 1rem;" onclick="location.hash = '#/'">返回首页</button>
        </div>
      </div>
    `;
  }

  async function renderRhythmExercise() {
    let rhythms = [];
    try {
      const result = await apiGet('/rhythms');
      rhythms = result.rhythms || [];
    } catch (error) {
      console.error('Failed to load rhythms:', error);
      rhythms = [
        { index: 0, pattern: 'c4' },
        { index: 1, pattern: 'c8 c8' },
        { index: 2, pattern: 'c4' },
        { index: 3, pattern: 'c8 c16 c16' },
        { index: 4, pattern: 'r4' },
        { index: 5, pattern: 'c4 c8' }
      ];
    }

    mainEl.innerHTML = `
      <div class="solfege-container">
        <div class="glass-card exercise-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="section-title" style="margin: 0 0 0.25rem 0;">节奏训练</h3>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">听辨节奏，选择正确的节奏型</p>
            </div>
            <button class="back-btn" id="rhythm-back-btn" title="返回首页">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="glass-card stats-card">
          <div class="stat">
            <span class="stat-label">得分</span>
            <span class="stat-value aurora-text">${score}</span>
          </div>
          <div class="stat">
            <span class="stat-label">题目</span>
            <span class="stat-value">${totalQuestions}</span>
          </div>
          <div class="stat">
            <span class="stat-label">正确率</span>
            <span class="stat-value">${totalQuestions > 0 ? Math.round(score / totalQuestions * 100) : 0}%</span>
          </div>
        </div>

          <div class="feedback" id="rhythm-feedback"></div>
        </div>

        <div class="glass-card answer-card">
          <div class="rhythm-grid">
            ${rhythms.slice(0, 12).map(r => `
              <button class="rhythm-btn" data-rhythm="${r.pattern}" data-index="${r.index}">
                <div class="rhythm-index">${r.index + 1}</div>
                <div class="rhythm-pattern">${r.pattern}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    await generateQuestion('rhythm');

    mainEl.querySelector('#play-rhythm')?.addEventListener('click', playRhythm);
    mainEl.querySelector('#rhythm-back-btn')?.addEventListener('click', () => renderHome());
    mainEl.querySelectorAll('[data-rhythm]').forEach(btn => {
      btn.addEventListener('click', () => checkRhythmAnswer(btn.dataset.rhythm));
    });
  }

  async function generateQuestion(type) {
    try {
      // 后端 /new_question 接受查询参数
      const result = await apiPost(`/new_question?exercise_type=${type}`, {});
      currentQuestion = result.question;
      totalQuestions++;
      updateUI();
    } catch (error) {
      console.error('Failed to generate question:', error);
      generateLocalQuestion(type);
    }
  }

  function generateLocalQuestion(type) {
    if (type === 'harmonic_interval' || type === 'melodic_interval') {
      const intervals = [
        { name: '纯一度', abbr: 'P1', semitones: 0 },
        { name: '小二度', abbr: 'm2', semitones: 1 },
        { name: '大二度', abbr: 'M2', semitones: 2 },
        { name: '小三度', abbr: 'm3', semitones: 3 },
        { name: '大三度', abbr: 'M3', semitones: 4 },
        { name: '纯四度', abbr: 'P4', semitones: 5 },
        { name: '纯五度', abbr: 'P5', semitones: 7 },
        { name: '小六度', abbr: 'm6', semitones: 8 },
        { name: '大六度', abbr: 'M6', semitones: 9 },
        { name: '小七度', abbr: 'm7', semitones: 10 },
        { name: '大七度', abbr: 'M7', semitones: 11 },
        { name: '纯八度', abbr: 'P8', semitones: 12 }
      ];
      const interval = intervals[Math.floor(Math.random() * intervals.length)];
      const baseNote = 52 + Math.floor(Math.random() * 12);
      currentQuestion = {
        question_id: 'q_local',
        type: type,
        notes: [baseNote, baseNote + interval.semitones],
        frequencies: [freqFromMidi(baseNote), freqFromMidi(baseNote + interval.semitones)],
        correct_answer: interval.abbr,
        interval_info: interval
      };
    } else if (type === 'chord') {
      const chords = [
        { name: '大三和弦', abbr: 'M', notes: [0, 4, 7] },
        { name: '小三和弦', abbr: 'm', notes: [0, 3, 7] },
        { name: '增三和弦', abbr: 'aug', notes: [0, 4, 8] },
        { name: '减三和弦', abbr: 'dim', notes: [0, 3, 6] },
        { name: '属七和弦', abbr: '7', notes: [0, 4, 7, 10] }
      ];
      const chord = chords[Math.floor(Math.random() * chords.length)];
      const baseNote = 52 + Math.floor(Math.random() * 8);
      const notes = chord.notes.map(n => baseNote + n);
      currentQuestion = {
        question_id: 'q_local',
        type: 'chord',
        notes: notes,
        frequencies: notes.map(n => freqFromMidi(n)),
        correct_answer: chord.abbr,
        chord_info: chord
      };
    } else if (type === 'identify_tone') {
      const notenames = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'b'];
      const notename = notenames[Math.floor(Math.random() * notenames.length)];
      const baseNote = 52 + Math.floor(Math.random() * 8);
      currentQuestion = {
        question_id: 'q_local',
        type: 'identify_tone',
        notes: [baseNote],
        frequencies: [freqFromMidi(baseNote)],
        correct_answer: notename
      };
    }
    totalQuestions++;
    updateUI();
  }

  function animatePlayButton(selector) {
    const btn = mainEl.querySelector(selector);
    if (!btn) return;
    
    // Scale bounce
    gsap.fromTo(btn, 
      { scale: 0.9 }, 
      { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
    );
    
    // Create voice wave ripples around the play button
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('span');
      ring.className = 'play-ripple-ring';
      btn.appendChild(ring);
      
      gsap.fromTo(ring,
        { scale: 1, opacity: 0.6 },
        { scale: 2.2, opacity: 0, duration: 1.2, delay: i * 0.3, ease: 'power2.out', onComplete: () => ring.remove() }
      );
    }
  }

  function playInterval(isHarmonic) {
    if (!currentQuestion) return;
    animatePlayButton('#play-interval');
    const [note1, note2] = currentQuestion.notes;
    
    if (isHarmonic) {
      playNote(note1, 1);
      playNote(note2, 1);
    } else {
      playNote(note1, 0.6);
      setTimeout(() => playNote(note2, 0.6), 500);
    }
  }

  function playChord() {
    if (!currentQuestion) return;
    animatePlayButton('#play-chord');
    currentQuestion.notes.forEach(n => playNote(n, 1.5));
  }

  function playTone() {
    if (!currentQuestion) return;
    animatePlayButton('#play-tone');
    playNote(currentQuestion.notes[0], 1.5);
  }

  function playRhythm() {
    if (!currentQuestion || !currentQuestion.rhythm_pattern) return;
    animatePlayButton('#play-rhythm');
    // 简单实现：播放节奏 - 每个pattern播放一个音符
    const bpm = 120;
    const beatDuration = 60 / bpm;
    let time = 0;

    currentQuestion.rhythm_pattern.forEach((pattern, index) => {
      setTimeout(() => {
        // 简化的节奏播放 - 使用不同的音高来区分
        const baseNote = 60 + (index % 12) * 2;
        if (pattern.startsWith('r')) {
          // 休止符，不播放
        } else {
          playNote(baseNote, beatDuration * 0.8);
        }
      }, time * 1000);
      time += beatDuration;
    });
  }

  async function checkRhythmAnswer(selected) {
    if (!currentQuestion) return;
    await checkAnswer(selected, 'rhythm', '#rhythm-feedback');
  }

  async function checkIntervalAnswer(selected, type) {
    if (!currentQuestion) return;
    await checkAnswer(selected, type, '#interval-feedback');
  }

  async function checkChordAnswer(selected) {
    if (!currentQuestion) return;
    await checkAnswer(selected, 'chord', '#chord-feedback');
  }

  async function checkToneAnswer(selected) {
    if (!currentQuestion) return;
    await checkAnswer(selected, 'identify_tone', '#tone-feedback');
  }

  async function checkAnswer(selected, type, feedbackSelector) {
    const correct = selected === currentQuestion.correct_answer;
    if (correct) score++;
    
    // GSAP Button Feedback Anim
    let btn = mainEl.querySelector(`[data-interval="${selected}"]`) ||
              mainEl.querySelector(`[data-chord="${selected}"]`) ||
              mainEl.querySelector(`[data-tone="${selected}"]`) ||
              mainEl.querySelector(`[data-rhythm="${selected}"]`);
              
    if (btn) {
      if (correct) {
        btn.classList.add('correct');
        gsap.fromTo(btn, 
          { scale: 1 }, 
          { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }
        );
      } else {
        btn.classList.add('incorrect');
        gsap.fromTo(btn,
          { x: -8 },
          { x: 8, duration: 0.06, repeat: 5, yoyo: true, ease: 'none', onComplete: () => gsap.set(btn, { x: 0 }) }
        );
        
        // Auto-highlight correct choice
        const correctVal = currentQuestion.correct_answer;
        const correctBtn = mainEl.querySelector(`[data-interval="${correctVal}"]`) ||
                            mainEl.querySelector(`[data-chord="${correctVal}"]`) ||
                            mainEl.querySelector(`[data-tone="${correctVal}"]`) ||
                            mainEl.querySelector(`[data-rhythm="${correctVal}"]`);
        if (correctBtn) {
          correctBtn.classList.add('correct');
        }
      }
    }
    
    try {
      await apiPost('/evaluate', {
        session_id: sessionId,
        question_id: currentQuestion.question_id,
        user_answer: selected,
        exercise_type: type
      });
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
    }

    const correctName = currentQuestion.interval_info?.name || 
                        currentQuestion.chord_info?.name || 
                        currentQuestion.correct_answer;
    
    showFeedback(feedbackSelector, correct, correctName);
    setTimeout(() => generateQuestion(type), 1500);
  }

  function showFeedback(selector, correct, correctName) {
    const feedback = mainEl.querySelector(selector);
    feedback.textContent = correct ? '✓ 正确！' : `✗ 错误，正确答案是 ${correctName}`;
    feedback.className = `feedback ${correct ? 'correct' : 'wrong'}`;
    
    // GSAP feedback text scale
    gsap.fromTo(feedback, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });

    setTimeout(() => {
      feedback.className = 'feedback';
      feedback.textContent = '';
    }, 1500);
  }

  function updateUI() {
    const stats = mainEl.querySelectorAll('.stat-value');
    if (stats.length >= 3) {
      stats[0].textContent = score;
      stats[1].textContent = totalQuestions;
      stats[2].textContent = totalQuestions > 0 ? Math.round(score / totalQuestions * 100) + '%' : '0%';
    }
  }

  function freqFromMidi(midiNote) {
    return Math.pow(2, (midiNote - 69) / 12) * 440;
  }

  function playNote(midiNote, duration) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freqFromMidi(midiNote);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  renderHeader(false);
  renderHome();

  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      renderHeader(currentExercise !== null);
    }
  });

  window.addEventListener('theme-changed', () => {
    renderHeader(currentExercise !== null);
  });
}