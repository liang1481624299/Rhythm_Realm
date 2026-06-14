/**
 * 主题管理 - 主页和 Sposobin 共用
 */

// 初始化主题（从 localStorage 或系统偏好读取）
export function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    return true; // dark mode
  }
  return false; // light mode
}

// 切换主题
export function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  // 触发主题变化事件
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
  return isDark;
}

// 获取当前主题状态
export function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// 监听其他页面或标签的主题变化
export function setupThemeSync() {
  // 监听 storage 变化（其他标签页的主题变化）
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      if (e.newValue === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // 触发自定义事件，让 UI 更新
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark: isDarkMode() } }));
    }
  });

  // 监听我们自己的主题变化，同步到 localStorage
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isDark = isDarkMode();
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });
}
