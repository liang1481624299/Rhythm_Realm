// 极光动态背景：3-4 个彩色径向渐变球体缓慢漂移
export function createAuroraBackground() {
  const root = document.createElement('div');
  root.className = 'aurora-bg';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="aurora-blob aurora-blob-1"></div>
    <div class="aurora-blob aurora-blob-2"></div>
    <div class="aurora-blob aurora-blob-3"></div>
    <div class="aurora-blob aurora-blob-4"></div>
    <div class="aurora-noise"></div>
  `;
  return root;
}
