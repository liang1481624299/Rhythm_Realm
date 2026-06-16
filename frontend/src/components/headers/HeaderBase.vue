<template>
  <header class="site-header" :class="{ 'site-header--sposobin': variant === 'sposobin', 'site-header--mobile-menu-open': mobileMenuOpen }">
    <div class="site-header-inner">
      <div class="site-header-slot site-header-slot--left">
        <button
          class="mobile-menu-btn"
          aria-label="打开菜单"
          aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span v-html="mobileMenuOpen ? iconX : iconMenu" />
        </button>
        <slot name="brand">
          <a href="#/" class="header-brand">
            <span class="header-brand-icon">🌌</span>
            <span class="header-brand-text">徵羽乐界</span>
          </a>
        </slot>
        <slot name="left" />
      </div>

      <div class="site-header-slot site-header-slot--center">
        <slot name="center" />
      </div>

      <div class="site-header-slot site-header-slot--right">
        <slot name="right" />
      </div>
    </div>

    <transition name="slide">
      <div v-show="mobileMenuOpen" class="mobile-menu-overlay" @click="mobileMenuOpen = false">
        <div class="mobile-menu" @click.stop>
          <div class="mobile-menu-header">
            <span class="mobile-menu-title">导航</span>
            <button class="mobile-menu-close" @click="mobileMenuOpen = false">
              <span v-html="iconX" />
            </button>
          </div>
          <div class="mobile-menu-content">
            <slot name="mobile-menu" />
          </div>
        </div>
      </div>
    </transition>

    <slot name="overlay" />
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { Icons } from '../../lib/icons.js';

defineProps({
  variant: {
    type: String,
    default: 'global',
    validator: v => ['global', 'sposobin'].includes(v)
  }
});

const iconMenu = Icons.menu;
const iconX = Icons.x;

const mobileMenuOpen = ref(false);
</script>