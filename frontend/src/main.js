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
  </svg>`
};

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

    // Sposobin页面隐藏主页header和极光背景
    if (isSposobin) {
      headerSlot.style.display = 'none';
      auroraSlot.style.display = 'none';
      mainSlot.style.paddingTop = '0';
      return;
    }

    headerSlot.style.display = '';
    auroraSlot.style.display = '';
    mainSlot.style.paddingTop = '4rem';

    headerSlot.innerHTML = `
      <div class="header-inner">
        <a href="#/" class="header-brand" data-nav>
          <span style="font-size: 1.5rem;">🌌</span>
          <span>徵羽乐界</span>
        </a>

        <nav class="header-nav">
          <a href="#/" class="nav-link ${window.location.hash === '#/' || window.location.hash === '' ? 'nav-link-active' : ''}" data-nav>首页</a>
          <a href="#/sposobin" class="nav-link ${window.location.hash === '#/sposobin' ? 'nav-link-active' : ''}" data-nav>Sposobin</a>
          <a href="#/solfege" class="nav-link ${window.location.hash === '#/solfege' ? 'nav-link-active' : ''}" data-nav>视唱练耳</a>
          <a href="#/grading" class="nav-link ${window.location.hash === '#/grading' ? 'nav-link-active' : ''}" data-nav>批改</a>
          <a href="#/about" class="nav-link ${window.location.hash === '#/about' ? 'nav-link-active' : ''}" data-nav>关于</a>
        </nav>

        <button class="theme-toggle-btn" id="theme-toggle" title="切换主题">
          ${isDark ? icons.sun : icons.moon}
        </button>
      </div>
    `;

    // 主题切换
    headerSlot.querySelector('#theme-toggle')?.addEventListener('click', () => {
      toggleTheme();
      renderHeader();
    });
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
