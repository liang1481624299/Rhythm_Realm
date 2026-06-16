<template>
  <HeaderBase variant="global">
    <template #brand>
      <a href="#/" class="header-brand" @click="goHome">
        <span class="header-brand-icon">🌌</span>
        <span class="header-brand-text">徵羽乐界</span>
      </a>
    </template>

    <template #center>
      <nav class="header-nav" aria-label="主导航">
        <a
          v-for="item in navItems"
          :key="item.path"
          :href="`#${item.path}`"
          class="nav-link"
          :class="{ 'nav-link--active': currentPath === item.path }"
          @click="onNav(item.path, $event)"
        >{{ item.label }}</a>
      </nav>
    </template>

    <template #right>
      <button
        class="theme-toggle-btn"
        :title="isDark ? '切换为亮色主题' : '切换为深色主题'"
        @click="onToggleTheme"
      >
        <span v-html="isDark ? iconSun : iconMoon" />
      </button>
    </template>

    <template #mobile-menu>
      <nav class="mobile-nav" aria-label="移动端主导航">
        <a
          v-for="item in navItems"
          :key="item.path"
          :href="`#${item.path}`"
          class="mobile-nav-link"
          :class="{ 'mobile-nav-link--active': currentPath === item.path }"
          @click="onMobileNav(item.path)"
        >
          <span v-html="getNavIcon(item.path)" />
          <span>{{ item.label }}</span>
        </a>
      </nav>
      <div class="mobile-menu-divider"></div>
      <button
        class="mobile-theme-toggle"
        :title="isDark ? '切换为亮色主题' : '切换为深色主题'"
        @click="onToggleTheme"
      >
        <span v-html="isDark ? iconSun : iconMoon" />
        <span>{{ isDark ? '切换为亮色主题' : '切换为深色主题' }}</span>
      </button>
    </template>
  </HeaderBase>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import HeaderBase from './HeaderBase.vue';
import { Icons } from '../../lib/icons.js';
import { isDarkMode, toggleTheme } from '../../lib/theme.js';

const iconSun = Icons.sun;
const iconMoon = Icons.moon;
const iconHome = Icons.home;
const iconMusic = Icons.music;
const iconEar = Icons.ear;
const iconCamera = Icons.camera;
const iconInfo = Icons.link;

const navItems = [
  { path: '/', label: '首页' },
  { path: '/sposobin', label: 'Sposobin' },
  { path: '/solfege', label: '视唱练耳' },
  { path: '/grading', label: '批改' },
  { path: '/about', label: '关于' }
];

const currentPath = ref(getPath());
const isDark = ref(isDarkMode());

function getPath() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

function getNavIcon(path) {
  switch (path) {
    case '/': return iconHome;
    case '/sposobin': return iconMusic;
    case '/solfege': return iconEar;
    case '/grading': return iconCamera;
    case '/about': return iconInfo;
    default: return iconHome;
  }
}

function onNav(path, e) {
  if (getPath() === path) {
    e.preventDefault();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function onMobileNav(path) {
  window.location.hash = path;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function onToggleTheme() {
  toggleTheme();
  isDark.value = isDarkMode();
}

function onHashChange() {
  currentPath.value = getPath();
}

function onThemeChanged() {
  isDark.value = isDarkMode();
}

function onStorage(e) {
  if (e.key === 'theme') onThemeChanged();
}

function goHome(e) {
  if (getPath() === '/') {
    e.preventDefault();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('theme-changed', onThemeChanged);
  window.addEventListener('storage', onStorage);
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('theme-changed', onThemeChanged);
  window.removeEventListener('storage', onStorage);
});
</script>