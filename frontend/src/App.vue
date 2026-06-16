<template>
  <div ref="auroraSlot" class="aurora-slot"></div>

  <component :is="headerComponent" v-if="headerComponent" :key="currentPath" />

  <main ref="mainSlot" class="app-main" :class="{ 'app-main--sposobin': isSposobin }"></main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, createApp } from 'vue';
import { createAuroraBackground } from './components/AuroraBackground.js';
import { createRouter } from './lib/router.js';
import { renderHome } from './pages/Home.js';
import { renderGrading } from './pages/Grading.js';
import { renderSolfege } from './pages/Solfege.js';
import { renderSposobin, initSposobinStore } from './pages/Sposobin.js';
import { initTheme, setupThemeSync } from './lib/theme.js';

import GlobalHeader from './components/headers/GlobalHeader.vue';
import SposobinHeader from './components/headers/SposobinHeader.vue';

const auroraSlot = ref(null);
const mainSlot = ref(null);
const currentPath = ref(getPath());

const isSposobin = computed(() => currentPath.value === '/sposobin');

const headerComponent = computed(() => {
  return isSposobin.value ? SposobinHeader : GlobalHeader;
});

function getPath() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function onHashChange() {
  currentPath.value = getPath();
}

let mountedApp = null;

function unmountCurrentVueApp() {
  if (mountedApp) {
    try { mountedApp.unmount(); } catch (e) { /* noop */ }
    mountedApp = null;
  }
}

function mountVuePage(container, Component) {
  unmountCurrentVueApp();
  container.innerHTML = '';
  const mountPoint = document.createElement('div');
  container.appendChild(mountPoint);
  const app = createApp(Component);
  app.mount(mountPoint);
  mountedApp = app;
}

onMounted(() => {
  initTheme();
  setupThemeSync();

  if (auroraSlot.value) {
    auroraSlot.value.appendChild(createAuroraBackground());
  }

  window.addEventListener('hashchange', onHashChange);

  // 初始化 Sposobin store
  initSposobinStore();

  if (mainSlot.value) {
    const router = createRouter(mainSlot.value)
      .add('/', ({ container }) => renderHome(container))
      .add('/sposobin', renderSposobin)
      .add('/solfege', renderSolfege)
      .add('/grading', ({ container }) => renderGrading(container));
    router.start();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange);
  unmountCurrentVueApp();
});
</script>

<style>
@import './styles/global.css';

.aurora-slot {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
</style>