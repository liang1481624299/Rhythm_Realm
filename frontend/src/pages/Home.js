// 主页：介绍页 + 极光视觉
import { icons } from '../components/icons';

export function renderHome(container) {
  container.innerHTML = `
    <section class="page-enter page-container" style="padding-top: 2.5rem; padding-bottom: 2.5rem;">
      <div class="glass-card" style="padding: 1.5rem; text-align: center;">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500;" class="glass-pill mb-6">
          <span style="position: relative; display: flex; width: 0.5rem; height: 0.5rem;">
            <span style="position: absolute; inline-flex; width: 100%; height: 100%; border-radius: 9999px; background: #34d399; opacity: 0.75; animation: pulse 2s infinite;"></span>
            <span style="position: relative; inline-flex; border-radius: 9999px; width: 0.5rem; height: 0.5rem; background: #34d399;"></span>
          </span>
          <span style="color: #64748b;">Rhythm Realm · v0.1.0</span>
        </div>

        <h1 style="font-size: 2.25rem; font-weight: 700; line-height: 1.1; margin: 0;">
          <span class="aurora-text" style="display: block;">徵羽乐界</span>
          <span style="display: block; margin-top: 0.5rem; color: #0f172a;" class="dark:text-slate-50">Rhythm Realm</span>
        </h1>

        <p style="margin-top: 1.5rem; font-size: 1rem; color: #64748b; max-width: 42rem; margin-left: auto; margin-right: auto; line-height: 1.625;" class="dark:text-slate-300">
          一片极光之上的音乐殿堂。这里是音乐理论与创作的汇聚之地——
          从传统和声到现代技法，让每一次探索都充满灵感。
        </p>

        <div style="margin-top: 2rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem;">
          <a href="#/sposobin" class="btn-primary" data-nav>
            <span>进入 Sposobin</span>
            ${icons.chevronRight(16)}
          </a>
          <button type="button" class="btn-secondary" data-action="scroll-cards">
            ${icons.sparkles(16)}
            <span>探索功能</span>
          </button>
        </div>
      </div>

      <div style="margin-top: 2rem; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem;" data-cards>
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
          desc: '自动计算最优声部连接，遵循传统四部和声写作规范，实时预警违规进行。',
          color: 'blue',
        })}
        ${featureCard({
          title: '离调网络',
          desc: '完整的离调和声网络，副下属、那不勒斯、增六和弦等功能组全覆盖。',
          color: 'cyan',
        })}
        ${featureCard({
          title: '极光视觉',
          desc: '动态渐变极光背景，毛玻璃质感面板，极光美学与功能完美融合。',
          color: 'pink',
        })}
      </div>

      <div style="margin-top: 2rem;" class="glass-card" style="padding: 1.5rem;">
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
          <div style="display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem;" class="aurora-gradient text-white">
            ${icons.info(20)}
          </div>
          <div style="min-width: 0;">
            <h2 style="font-size: 1.125rem; font-weight: 600; color: #0f172a; margin: 0;" class="dark:text-slate-50">
              关于 Sposobin 写作台
            </h2>
            <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b; line-height: 1.625;" class="dark:text-slate-300">
              基于 Python (FastAPI) + Vue 3 的前后端分离架构；实装基于有向无环图(DAG)的全局寻优核心算法与连通性探针；提供自由推演、旋律配和声(Soprano)及指定和声序列三种标准工作台模式。
            </p>
          </div>
        </div>
      </div>
    </section>
  `;

  // 响应式布局
  if (window.innerWidth >= 640) {
    container.querySelector('[data-cards]').style.gridTemplateColumns = 'repeat(2, 1fr)';
  }
  if (window.innerWidth >= 1024) {
    container.querySelector('[data-cards]').style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  bindHomeEvents(container);
}

function featureCard({ title, desc, color }) {
  const colorClass = `card-${color}`;
  return `
    <div class="glass-card ${colorClass}" style="padding: 1.25rem; cursor: pointer; transition: transform 300ms;">
      <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; margin-bottom: 1rem;"></div>
      <h3 style="font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0;" class="dark:text-slate-50">${title}</h3>
      <p style="margin-top: 0.375rem; font-size: 0.875rem; color: #64748b; line-height: 1.5;" class="dark:text-slate-300">${desc}</p>
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
