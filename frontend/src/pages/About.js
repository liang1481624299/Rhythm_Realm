// 关于页面：作者信息 + 联系方式
export function renderAbout(container) {
  container.innerHTML = `
    <section class="page-enter about-layout">
      <!-- 个人信息卡片 -->
      <header class="glass-card profile-card">
        <!-- 头像 -->
        <div class="profile-avatar">
          D
        </div>
        <div style="flex: 1; min-width: 0;">
          <h1 class="profile-name">Dylan Liang</h1>
          <p class="profile-role">开发者 / Developer</p>
          <p class="profile-bio">
            徵羽乐界 (Rhythm Realm) 的创建者，专注于音乐理论与技术的结合。
          </p>
        </div>
      </header>

      <!-- 联系方式 -->
      <article class="glass-card section-card">
        <h2 class="section-title-bar">
          <span class="section-title-dot dot-cyan"></span>
          联系方式
        </h2>
        <div class="contact-list">
          <!-- GitHub -->
          <a
            href="https://github.com/liang1481624299"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <div class="contact-item-left">
              <span class="contact-icon-box" style="background: #0f172a;">
                ${githubIcon(20)}
              </span>
              <div>
                <p class="contact-link-title">GitHub</p>
                <p class="contact-link-desc">@liang1481624299</p>
              </div>
            </div>
            ${externalIcon(16)}
          </a>

          <!-- B站 -->
          <a
            href="https://space.bilibili.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <div class="contact-item-left">
              <span class="contact-icon-box" style="background: #00A1D6;">
                ${bilibiliIcon(20)}
              </span>
              <div>
                <p class="contact-link-title">哔哩哔哩</p>
                <p class="contact-link-desc">Bilibili</p>
              </div>
            </div>
            ${externalIcon(16)}
          </a>

          <!-- 邮箱 1 -->
          <a
            href="mailto:shiroko@feishu.millennium.dpdns.org"
            class="contact-link"
          >
            <div class="contact-item-left">
              <span class="contact-icon-box aurora-gradient">
                ${mailIcon(20)}
              </span>
              <div>
                <p class="contact-link-title">Feishu 邮箱</p>
                <p class="contact-link-desc">shiroko@feishu.millennium.dpdns.org</p>
              </div>
            </div>
            ${externalIcon(16)}
          </a>

          <!-- 邮箱 2 -->
          <a
            href="mailto:shiroko@tencent.millennium.dpdns.org"
            class="contact-link"
          >
            <div class="contact-item-left">
              <span class="contact-icon-box" style="background: linear-gradient(135deg, #10b981, #06b6d4);">
                ${mailIcon(20)}
              </span>
              <div>
                <p class="contact-link-title">Tencent 邮箱</p>
                <p class="contact-link-desc">shiroko@tencent.millennium.dpdns.org</p>
              </div>
            </div>
            ${externalIcon(16)}
          </a>
        </div>
      </article>

      <!-- 关于项目 -->
      <article class="glass-card section-card">
        <h2 class="section-title-bar">
          <span class="section-title-dot dot-purple"></span>
          关于项目
        </h2>
        <p class="profile-bio">
          <span class="aurora-text" style="font-weight: 700;">徵羽乐界</span> (Rhythm Realm) 是一个音乐理论学习与创作平台。
          Sposobin 是其中的四部和声写作引擎，帮助用户学习和练习四部和声写作技巧。
        </p>
        <div class="badge-group">
          <span class="badge-item badge-cyan">音乐理论</span>
          <span class="badge-item badge-purple">四部和声</span>
          <span class="badge-item badge-pink">Web Audio</span>
        </div>
      </article>

      <!-- 返回按钮 -->
      <div style="margin-top: 2rem; display: flex; justify-content: center;">
        <a href="#/" class="btn-primary" data-nav>
          ${homeIcon(16)}
          <span>返回首页</span>
        </a>
      </div>
    </section>
  `;
}

// 图标定义
function githubIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>`;
}

function bilibiliIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
  </svg>`;
}

function mailIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>`;
}

function externalIcon(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); transition: color var(--transition-fast);">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>`;
}

function homeIcon(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>`;
}

