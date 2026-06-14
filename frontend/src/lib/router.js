// Hash 路由：使用 URL hash 记录当前路径，监听 hashchange 事件以支持浏览器前进/后退
// 路由表：path -> 渲染函数

export function createRouter(container) {
  const routes = [];
  let fallback = null;
  let currentPath = '';

  function resolve() {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    currentPath = path;

    for (const route of routes) {
      const match = route.pattern.exec(path);
      if (match) {
        route.render({ path, container });
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
    }

    if (fallback) {
      fallback({ path, container });
    }
  }

  return {
    add(path, render) {
      const keys = [];
      const regex = path
        .replace(/\//g, '\\/')
        .replace(/:([a-zA-Z_]+)/g, (_, key) => {
          keys.push(key);
          return '([^/]+)';
        });
      const pattern = new RegExp(`^${regex}\\/?$`);
      routes.push({ pattern, keys, render });
      return this;
    },

    setFallback(render) {
      fallback = render;
      return this;
    },

    start() {
      window.addEventListener('hashchange', resolve);
      resolve();
    },

    navigate(path) {
      const target = path.startsWith('#') ? path : `#${path}`;
      if (window.location.hash === target) {
        resolve();
      } else {
        window.location.hash = target;
      }
    },

    refresh() {
      resolve();
    },

    getPath() {
      return currentPath;
    }
  };
}
