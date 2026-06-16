<template>
  <HeaderBase variant="sposobin">
    <template #brand>
      <a href="#/" class="header-brand" title="返回首页" @click="onHome">
        <span class="header-brand-icon">🌌</span>
      </a>
      <h1 class="header-title">
        Sposobin Engine
        <span class="version-badge">V2.0</span>
      </h1>
    </template>

    <template #center>
      <div class="settings-wrap" ref="settingsWrap">
        <button
          class="settings-btn"
          :class="{ 'settings-btn--open': settingsOpen }"
          :aria-expanded="settingsOpen"
          aria-haspopup="true"
          @click="settingsOpen = !settingsOpen"
        >
          <span v-html="iconSettings" />
          <span class="settings-btn-label">设置</span>
          <span class="settings-btn-chevron" :class="{ 'is-open': settingsOpen }" v-html="iconChevronDown" />
        </button>

        <transition name="dropdown">
          <div v-show="settingsOpen" class="settings-panel" role="menu">
            <div class="settings-panel-title">模式</div>
            <ul class="settings-list">
              <li
                v-for="m in modes"
                :key="m.value"
                role="menuitem"
                tabindex="0"
                class="settings-item"
                :class="{ 'settings-item--active': store.mode === m.value }"
                @click="onSelectMode(m.value)"
                @keydown.enter="onSelectMode(m.value)"
                @keydown.space.prevent="onSelectMode(m.value)"
              >
                <span class="settings-item-radio">
                  <span v-if="store.mode === m.value" class="settings-item-radio-dot" />
                </span>
                <span class="settings-item-text">
                  <span class="settings-item-label">{{ m.label }}</span>
                  <span class="settings-item-desc">{{ m.desc }}</span>
                </span>
              </li>
            </ul>

            <div class="settings-panel-title">调性</div>
            <select
              class="settings-select"
              :value="store.key_name"
              @change="onChangeKey($event.target.value)"
            >
              <option v-for="k in keyOptions" :key="k" :value="k">{{ k }}</option>
            </select>

            <div class="settings-panel-title">拍号</div>
            <div class="settings-timesig">
              <button
                v-for="t in timesigOptions"
                :key="t"
                class="settings-pill"
                :class="{ 'settings-pill--active': store.time_signature === t }"
                @click="onChangeTimesig(t)"
              >{{ t }}</button>
            </div>
          </div>
        </transition>
      </div>
    </template>

    <template #right>
      <button class="grading-btn" id="sposobin-grading-btn" title="拍照批改" @click="onGrading">
        <span v-html="iconCamera" />
        <span class="grading-btn-label">批改</span>
      </button>

      <button
        class="theme-toggle-btn"
        :title="isDark ? '切换为亮色主题' : '切换为深色主题'"
        @click="onToggleTheme"
      >
        <span v-html="isDark ? iconSun : iconMoon" />
      </button>
    </template>

    <template #mobile-menu>
      <div class="mobile-settings-section">
        <div class="mobile-settings-title">模式</div>
        <div class="mobile-settings-options">
          <button
            v-for="m in modes"
            :key="m.value"
            class="mobile-settings-option"
            :class="{ 'mobile-settings-option--active': store.mode === m.value }"
            @click="onSelectMode(m.value)"
          >{{ m.label }}</button>
        </div>
      </div>
      <div class="mobile-menu-divider"></div>
      <div class="mobile-settings-section">
        <div class="mobile-settings-title">调性</div>
        <select
          class="mobile-settings-select"
          :value="store.key_name"
          @change="onChangeKey($event.target.value)"
        >
          <option v-for="k in keyOptions" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <div class="mobile-settings-section">
        <div class="mobile-settings-title">拍号</div>
        <div class="mobile-settings-options">
          <button
            v-for="t in timesigOptions"
            :key="t"
            class="mobile-settings-option"
            :class="{ 'mobile-settings-option--active': store.time_signature === t }"
            @click="onChangeTimesig(t)"
          >{{ t }}</button>
        </div>
      </div>
      <div class="mobile-menu-divider"></div>
      <button class="mobile-grading-btn" @click="onGrading">
        <span v-html="iconCamera" />
        <span>拍照批改</span>
      </button>
      <button class="mobile-theme-toggle" @click="onToggleTheme">
        <span v-html="isDark ? iconSun : iconMoon" />
        <span>{{ isDark ? '切换为亮色主题' : '切换为深色主题' }}</span>
      </button>
    </template>
  </HeaderBase>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import HeaderBase from './HeaderBase.vue';
import { Icons } from '../../lib/icons.js';
import { isDarkMode, toggleTheme } from '../../lib/theme.js';
import {
  sposobinStore,
  SPOSOBIN_MODES,
  SPOSOBIN_KEY_OPTIONS,
  SPOSOBIN_TIMESIG_OPTIONS,
  setSposobinMode,
  setSposobinKey,
  setSposobinTimeSig
} from '../../stores/sposobin.js';

const store = sposobinStore;
const modes = SPOSOBIN_MODES;
const keyOptions = SPOSOBIN_KEY_OPTIONS;
const timesigOptions = SPOSOBIN_TIMESIG_OPTIONS;

const iconSettings = Icons.settings;
const iconChevronDown = Icons.chevronDown;
const iconSun = Icons.sun;
const iconMoon = Icons.moon;
const iconCamera = Icons.camera;

const settingsOpen = ref(false);
const settingsWrap = ref(null);
const isDark = ref(isDarkMode());

function onSelectMode(mode) {
  setSposobinMode(mode);
  settingsOpen.value = false;
}

function onChangeKey(k) {
  setSposobinKey(k);
}

function onChangeTimesig(t) {
  setSposobinTimeSig(t);
}

function onToggleTheme() {
  toggleTheme();
  isDark.value = isDarkMode();
}

function onHome(e) {
  if (window.location.hash === '' || window.location.hash === '#/' || window.location.hash === '#') {
    e.preventDefault();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function onGrading() {
  window.dispatchEvent(new CustomEvent('sposobin:open-grading'));
}

function onDocumentClick(e) {
  if (!settingsOpen.value) return;
  const wrap = settingsWrap.value;
  if (wrap && !wrap.contains(e.target)) {
    settingsOpen.value = false;
  }
}

function onEsc(e) {
  if (e.key === 'Escape') settingsOpen.value = false;
}

function onThemeChanged() {
  isDark.value = isDarkMode();
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onEsc);
  window.addEventListener('theme-changed', onThemeChanged);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onEsc);
  window.removeEventListener('theme-changed', onThemeChanged);
});

watch(() => window.location.hash, () => {
  settingsOpen.value = false;
});
</script>