// 主页：介绍页 + 极光视觉
import { icons } from '../components/icons';
import { gsap } from 'gsap';

export function renderHome(container) {
  container.innerHTML = `
    <section class="page-enter page-container home-section">
      <div class="glass-card home-hero">
        <div class="home-badge mb-6">
          <span class="pulse-container">
            <span class="pulse-glow"></span>
            <span class="pulse-dot"></span>
          </span>
          <span class="home-badge-text">Rhythm Realm · v0.2.0</span>
        </div>

        <h1 class="home-title">
          <span class="aurora-text" style="display: block;">徵羽乐界</span>
          <span class="home-subtitle">Rhythm Realm</span>
        </h1>

        <p class="home-description">
          一片极光之上的音乐殿堂。这里是音乐理论与创作的位置——
          从传统和声到现代技法，让每一次探索都充满灵感。
        </p>

        <div class="home-actions">
          <a href="#/sposobin" class="btn-primary" data-nav>
            <span>进入 Sposobin</span>
            ${icons.chevronRight(16)}
          </a>
          <a href="#/solfege" class="btn-secondary" data-nav>
            ${icons.music(16)}
            <span>视唱练耳</span>
          </a>
          <button type="button" class="btn-secondary" data-action="scroll-cards">
            ${icons.sparkles(16)}
            <span>探索功能</span>
          </button>
        </div>
      </div>

      <div class="features-grid" data-cards>
        ${featureCard({
          title: '斯波索宾和声',
          desc: '基于 DAG 全局寻优的四部和声写作引擎，支持自由模式、高音题模式、低音题模式。',
          color: 'cyan',
        })}
        ${featureCard({
          title: '实时乐谱渲染',
          desc: '出版级五线谱排版，音符、调号、拍号、小节线自动布局，支持导出 MusicXML。',
          color: 'pink',
         })}
        ${featureCard({
          title: '物理级音频',
          desc: 'Salamander 真钢琴采样，Tone.js 物理级音频引擎，还原真实演奏质感。',
          color: 'purple',
        })}
        ${featureCard({
          title: '智能声部进行',
          desc: '自动计算最优声部连接，遵循传统四部 and 声写作规范，实时预警违规进行。',
          color: 'blue',
        })}
        ${featureCard({
          title: '离调网络',
          desc: '完整的离调和声网络，副下属、那不勒斯、增六和弦等功能组全覆盖。',
          color: 'cyan',
        })}
        ${featureCard({
          title: '拍照批改',
          desc: '上传手写作业照片，AI 根据斯波索宾规则库自动评分，多维诊断与个性化建议。',
          color: 'orange',
        })}
        ${featureCard({
          title: '极光视觉',
          desc: '动态渐变极光背景，毛玻璃质感面板，极光美学与功能完美融合。',
          color: 'pink',
        })}
        ${featureCard({
          title: '视唱练耳',
          desc: '音程识别、和弦训练、旋律听写、节奏训练，全面提升音乐听觉能力。',
          color: 'green',
        })}
      </div>

      <div class="glass-card home-info-card mt-8">
        <div class="home-info-inner">
          <div class="home-info-icon aurora-gradient text-white">
            ${icons.info(20)}
          </div>
          <div class="home-info-content">
            <h2 class="home-info-title">关于 Sposobin 写作台</h2>
            <p class="home-info-desc">
              基于 Python (FastAPI) + Vue 3 的前后端分离架构；实装基于有向无环图(DAG)的全局寻优核心算法与连通性探针；提供自由推演、旋律配和声(Soprano)及指定 and 声序列三种标准工作台模式。
            </p>
          </div>
        </div>
      </div>
    </section>
  `;

  bindHomeEvents(container);

  // GSAP Entrance Animations
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
  tl.fromTo(container.querySelector('.home-badge'), { y: -20, opacity: 0 }, { y: 0, opacity: 1, delay: 0.15 })
    .fromTo(container.querySelector('.home-title'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.6')
    .fromTo(container.querySelector('.home-description'), { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5')
    .fromTo(container.querySelector('.home-actions'), { y: 15, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5')
    .fromTo(container.querySelectorAll('.feature-card'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05 }, '-=0.5')
    .fromTo(container.querySelector('.home-info-card'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.4');
}

function featureCard({ title, desc, color }) {
  const colorClass = `card-${color}`;
  return `
    <div class="glass-card ${colorClass} feature-card">
      <div class="feature-icon-bullet"></div>
      <h3 class="feature-card-title">${title}</h3>
      <p class="feature-card-desc">${desc}</p>
    </div>
  `;
}

function bindHomeEvents(container) {
  // 导航链接
  container.querySelectorAll('a[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href') || '#/';
      const path = href.replace(/^#/, '');
      window.location.hash = path;
    });
  });

  // 滚动按钮
  const scrollBtn = container.querySelector('[data-action="scroll-cards"]');
  scrollBtn?.addEventListener('click', () => {
    const cards = container.querySelector('[data-cards]');
    if (cards) {
      cards.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// 脉冲动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
`;
document.head.appendChild(style);

