import './style.css';
import { createAuroraBackground } from './components/AuroraBackground';
import { createRouter } from './lib/router';
import { renderHome } from './pages/Home';
import { renderAbout } from './pages/About';
import { renderSposobin } from './pages/Sposobin';
import { renderGrading } from './pages/Grading';
import { renderSolfege } from './pages/Solfege';
import { initTheme, toggleTheme, isDarkMode, setupThemeSync } from './lib/theme';

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
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`,
  chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m6 9 6 6 6-6"></path>
  </svg>`,
  camera: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`
};

// 设置选项
const modes = [
  { value: 'FREE', label: '自由模式', desc: '自由添加和弦' },
  { value: 'SOPRANO', label: '高音题', desc: '给定高音旋律配和声' },
  { value: 'BASS', label: '低音题', desc: '给定低音旋律配和声' },
  { value: 'COMPOSE', label: '旋律写作', desc: '旋律与和声共同构思' }
];

const keyOptions = [
  'C 大调 (C Major)', 'G 大调 (G Major)', 'D 大调 (D Major)',
  'A 大调 (A Major)', 'E 大调 (E Major)', 'B 大调 (B Major)',
  'F# 大调 (F# Major)', 'F 大调 (F Major)', 'Bb 大调 (Bb Major)',
  'Eb 大调 (Eb Major)', 'Ab 大调 (Ab Major)', 'Db 大调 (Db Major)',
  'a 小调 (a Minor)', 'e 小调 (e Minor)', 'b 小调 (b Minor)',
  'f# 小调 (f# Minor)', 'c# 小调 (c# Minor)', 'g# 小调 (g# Minor)'
];

const timesigOptions = ['4/4', '3/4', '2/4'];

function initApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }

  // 初始化主题
  initTheme();
  setupThemeSync();

  // --- Layout Skeleton ---
  app.innerHTML = `
    <div class="aurora-layer" data-aurora></div>
    <header class="site-header" data-header></header>
    <main data-main style="position: relative; z-index: 10; padding-top: 4rem; min-height: 100vh;"></main>
  `;

  const auroraSlot = app.querySelector('[data-aurora]');
  const headerSlot = app.querySelector('[data-header]');
  const mainSlot = app.querySelector('[data-main]');

  // 极光背景
  auroraSlot.appendChild(createAuroraBackground());

  // Header
  function renderHeader() {
    const isDark = isDarkMode();
    const currentPath = window.location.hash.replace(/^#/, '') || '/';
    const isSposobin = currentPath === '/sposobin';

    headerSlot.style.display = '';
    auroraSlot.style.display = '';
    mainSlot.style.paddingTop = '4rem';

    // 设置面板HTML
    const settingsPanel = isSposobin ? `
      <div class="settings-wrap" id="settings-wrap">
        <button class="settings-btn" id="settings-btn" title="设置">
          <span>${icons.settings}</span>
          <span class="settings-btn-label">设置</span>
          <span class="settings-btn-chevron">${icons.chevronDown}</span>
        </button>
        <div class="settings-panel" id="settings-panel">
          <div class="settings-section">
            <div class="settings-panel-title">模式</div>
            <ul class="settings-list">
              ${modes.map(m => `
                <li class="settings-item" data-mode="${m.value}" ${window.sposobinStore?.mode === m.value ? 'class="settings-item settings-item--active"' : 'class="settings-item"'}>
                  <span class="settings-item-radio">
                    <span class="settings-item-radio-dot"></span>
                  </span>
                  <span class="settings-item-text">
                    <span class="settings-item-label">${m.label}</span>
                    <span class="settings-item-desc">${m.desc}</span>
                  </span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="settings-section">
            <div class="settings-panel-title">调性</div>
            <select class="settings-select" id="settings-key">
              ${keyOptions.map(k => `<option value="${k}" ${window.sposobinStore?.key_name === k ? 'selected' : ''}>${k}</option>`).join('')}
            </select>
          </div>

          <div class="settings-section">
            <div class="settings-panel-title">拍号</div>
            <div class="settings-timesig">
              ${timesigOptions.map(t => `<button class="settings-pill${window.sposobinStore?.time_signature === t ? ' settings-pill--active' : ''}" data-timesig="${t}">${t}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    ` : '';

    // 批改按钮
    const gradingBtn = isSposobin ? `
      <button class="grading-btn" id="grading-btn" title="拍照批改">
        <span>${icons.camera}</span>
        <span class="grading-btn-label">批改</span>
      </button>
    ` : '';

    headerSlot.innerHTML = `
      <div class="header-inner">
        <a href="#/" class="header-brand" data-nav>
          <span style="font-size: 1.5rem;">🌌</span>
          <span>${isSposobin ? 'Sposobin Engine' : '徵羽乐界'}</span>
        </a>

        <nav class="header-nav">
          <a href="#/" class="nav-link ${window.location.hash === '#/' || window.location.hash === '' ? 'nav-link-active' : ''}" data-nav>首页</a>
          <a href="#/sposobin" class="nav-link ${window.location.hash === '#/sposobin' ? 'nav-link-active' : ''}" data-nav>Sposobin</a>
          <a href="#/solfege" class="nav-link ${window.location.hash === '#/solfege' ? 'nav-link-active' : ''}" data-nav>视唱练耳</a>
          <a href="#/grading" class="nav-link ${window.location.hash === '#/grading' ? 'nav-link-active' : ''}" data-nav>批改</a>
          <a href="#/about" class="nav-link ${window.location.hash === '#/about' ? 'nav-link-active' : ''}" data-nav>关于</a>
        </nav>

        <div class="header-actions">
          ${settingsPanel}
          ${gradingBtn}
          <button class="theme-toggle-btn" id="theme-toggle" title="切换主题">
            ${isDark ? icons.sun : icons.moon}
          </button>
        </div>
      </div>
    `;

    // 主题切换
    headerSlot.querySelector('#theme-toggle')?.addEventListener('click', () => {
      toggleTheme();
      renderHeader();
    });

    // 设置按钮交互
    if (isSposobin) {
      const settingsBtn = headerSlot.querySelector('#settings-btn');
      const settingsPanel = headerSlot.querySelector('#settings-panel');
      const settingsWrap = headerSlot.querySelector('#settings-wrap');

      if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          settingsPanel.classList.toggle('settings-panel--open');
          settingsBtn.classList.toggle('settings-btn--open');
        });

        // 点击外部关闭
        document.addEventListener('click', function closeSettings(e) {
          if (!settingsWrap?.contains(e.target)) {
            settingsPanel.classList.remove('settings-panel--open');
            settingsBtn.classList.remove('settings-btn--open');
          }
        });

        // ESC关闭
        document.addEventListener('keydown', function closeOnEsc(e) {
          if (e.key === 'Escape') {
            settingsPanel.classList.remove('settings-panel--open');
            settingsBtn.classList.remove('settings-btn--open');
          }
        });

        // 模式选择
        headerSlot.querySelectorAll('.settings-item').forEach(item => {
          item.addEventListener('click', () => {
            const mode = item.dataset.mode;
            if (window.sposobinStore) {
              window.sposobinStore.mode = mode;
              window.sposobinStore.resetState();
            }
            settingsPanel.classList.remove('settings-panel--open');
            settingsBtn.classList.remove('settings-btn--open');
            renderHeader(); // 刷新以更新选中状态
          });
        });

        // 调性选择
        const keySelect = headerSlot.querySelector('#settings-key');
        if (keySelect && window.sposobinStore) {
          keySelect.addEventListener('change', (e) => {
            window.sposobinStore.key_name = e.target.value;
            window.sposobinStore.resetState();
          });
        }

        // 拍号选择
        headerSlot.querySelectorAll('.settings-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            const timesig = pill.dataset.timesig;
            if (window.sposobinStore) {
              window.sposobinStore.time_signature = timesig;
              window.sposobinStore.resetState();
            }
            renderHeader(); // 刷新以更新选中状态
          });
        });

        // 批改按钮
        const gradingBtn = headerSlot.querySelector('#grading-btn');
        if (gradingBtn) {
          gradingBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('sposobin:open-grading'));
          });
        }
      }
    }
  }

  // 404 页面
  function renderNotFound({ container }) {
    container.innerHTML = `
      <div class="page-container" style="padding-top: 4rem; text-align: center;">
        <div class="glass-card" style="padding: 3rem;">
          <h1 style="font-size: 6rem; margin: 0;">404</h1>
          <p style="font-size: 1.25rem; color: #64748b; margin-top: 1rem;">页面不存在</p>
          <a href="#/" class="btn-primary" style="margin-top: 2rem; display: inline-flex;">
            返回首页
          </a>
        </div>
      </div>
    `;
  }

  // Router
  const router = createRouter(mainSlot)
    .add('/', ({ container }) => renderHome(container))
    .add('/about', ({ container }) => renderAbout(container))
    .add('/sposobin', renderSposobin)
    .add('/solfege', renderSolfege)
    .add('/grading', ({ container }) => renderGrading(container))
    .setFallback(renderNotFound);

  renderHeader();
  router.start();

  // 监听 hash 变化更新 header
  window.addEventListener('hashchange', renderHeader);

  // 监听其他页面主题变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      renderHeader();
    }
  });
}

initApp();
