<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

type Theme = 'auto' | 'light' | 'dark'
const theme = ref<Theme>('auto')
try {
  theme.value = (localStorage.getItem('who-really-won/theme') as Theme | null) ?? 'auto'
} catch {
  // Storage unavailable: follow the system theme.
}
applyTheme()

function applyTheme() {
  const root = document.documentElement
  if (theme.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme.value)
}

function cycleTheme() {
  theme.value = theme.value === 'auto' ? 'dark' : theme.value === 'dark' ? 'light' : 'auto'
  applyTheme()
  try {
    localStorage.setItem('who-really-won/theme', theme.value)
  } catch {
    // Not remembered, that's all.
  }
}
</script>

<template>
  <header class="top">
    <div class="inner">
      <RouterLink to="/learn/1" class="brand">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <circle cx="11" cy="12" r="5.5" fill="var(--c0)" />
          <circle cx="21" cy="12" r="5.5" fill="var(--c1)" />
          <circle cx="16" cy="21" r="5.5" fill="var(--c2)" />
        </svg>
        <span>Who Really Won?</span>
      </RouterLink>
      <nav class="links" aria-label="Main">
        <RouterLink to="/learn/1" :class="{ active: $route.name === 'journey' }">Journey</RouterLink>
        <RouterLink to="/sandbox">Sandbox</RouterLink>
        <RouterLink to="/rigging">Rigging handbook</RouterLink>
        <RouterLink to="/lab">Theorem lab</RouterLink>
      </nav>
      <button class="btn small theme" :aria-label="`Theme: ${theme}. Change theme`" @click="cycleTheme">
        <span class="label">Theme: </span>{{ theme }}
      </button>
    </div>
  </header>
  <main class="page">
    <RouterView />
  </main>
  <footer class="foot small muted">
    Built on a Rust library of social choice theory, served from a Cloudflare Worker. Every result on this page is
    computed by the server, not looked up.
  </footer>
</template>

<style scoped>
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--page) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  text-decoration: none;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.links {
  display: flex;
  gap: 0.2rem;
  flex: 1;
  overflow-x: auto;
}

.links a {
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--ink-2);
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  white-space: nowrap;
}

.links a.router-link-active,
.links a.active {
  background: var(--ink);
  color: var(--surface);
}

.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.foot {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem 1rem 2rem;
  border-top: 1px solid var(--grid);
}

@media (max-width: 640px) {
  .brand span {
    display: none;
  }

  .theme {
    padding: 0.2em 0.6em;
  }

  .theme .label {
    display: none;
  }
}
</style>
