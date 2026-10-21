<script setup lang="ts">
import { nextTick, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { locale, LOCALES, setLocale } from './i18n'

const { t } = useI18n()
const route = useRoute()

// On a narrow screen the links scroll sideways: keep the current page's in view.
const links = ref<HTMLElement | null>(null)
const scrolled = ref(false)
const onScroll = () => (scrolled.value = (links.value?.scrollLeft ?? 0) > 4)
watch(
  () => [route.name, locale.value],
  async () => {
    await nextTick()
    const nav = links.value
    const here = nav?.querySelector<HTMLElement>('a.active, a.router-link-active')
    if (!nav || !here) return
    const left = here.offsetLeft - nav.offsetLeft
    if (left < nav.scrollLeft || left + here.offsetWidth > nav.scrollLeft + nav.clientWidth - 32) nav.scrollLeft = left - 8
    onScroll()
  },
  { immediate: true },
)

// A new page takes the focus to its content, as a page load would (slides of the journey don't).
const main = ref<HTMLElement | null>(null)
watch(
  () => route.name,
  (_, before) => {
    if (before !== undefined) main.value?.focus({ preventScroll: true })
  },
)

// The tab title and description follow the language.
watchEffect(() => {
  document.title = t('app.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'))
})

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
  <div class="shell" :class="{ full: !!$route.meta.fullscreen }">
    <a class="skip btn" href="#main">{{ t('app.skip') }}</a>
    <header class="top">
      <div class="inner">
        <RouterLink to="/learn/1" class="brand">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <circle cx="11" cy="12" r="5.5" fill="var(--c0)" />
            <circle cx="21" cy="12" r="5.5" fill="var(--c1)" />
            <circle cx="16" cy="21" r="5.5" fill="var(--c2)" />
          </svg>
          <span>{{ t('app.title') }}</span>
        </RouterLink>
        <nav ref="links" class="links" :class="{ scrolled }" :aria-label="t('app.nav.aria')" @scroll.passive="onScroll">
          <RouterLink to="/learn/1" :class="{ active: $route.name === 'journey' }">{{ t('app.nav.journey') }}</RouterLink>
          <RouterLink to="/sandbox">{{ t('app.nav.sandbox') }}</RouterLink>
          <RouterLink to="/rigging">{{ t('app.nav.rigging') }}</RouterLink>
          <RouterLink to="/lab">{{ t('app.nav.lab') }}</RouterLink>
        </nav>
        <div class="langs" role="group" :aria-label="t('app.language')">
          <button
            v-for="l in LOCALES"
            :key="l.id"
            class="lang"
            :lang="l.id"
            :title="l.label"
            :aria-label="l.label"
            :aria-pressed="locale === l.id"
            @click="setLocale(l.id)"
          >
            {{ l.id.toUpperCase() }}
          </button>
        </div>
        <button
          class="btn small theme"
          :aria-label="t('app.theme.aria', { theme: t(`app.theme.${theme}`) })"
          @click="cycleTheme"
        >
          <span class="label">{{ t('app.theme.prefix') }}</span>{{ t(`app.theme.${theme}`) }}
        </button>
      </div>
    </header>
    <main id="main" ref="main" class="page" tabindex="-1">
      <RouterView />
    </main>
    <footer v-if="!$route.meta.fullscreen" class="foot small muted">{{ t('app.footer') }}</footer>
  </div>
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
  scrollbar-width: none;
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

.skip {
  position: absolute;
  left: 1rem;
  top: 0.5rem;
  z-index: 20;
  transform: translateY(-200%);
}

.skip:focus {
  transform: none;
}

.page:focus {
  outline: none;
}

.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

/* The journey fills the screen below the header. */
.shell.full {
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.shell.full .page {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: none;
  padding: 0;
  display: flex;
}

.foot {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem 1rem 2rem;
  border-top: 1px solid var(--grid);
}

.langs {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
  flex: none;
}

.lang {
  border: none;
  background: none;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-2);
  padding: 0.25em 0.6em;
}

@media (pointer: coarse) {
  .lang {
    min-width: 44px;
    min-height: 44px;
  }

  .links a {
    padding-block: 0.65rem;
  }
}

.lang[aria-pressed='true'] {
  background: var(--ink);
  color: var(--surface);
}

@media (max-width: 640px) {
  .inner {
    flex-wrap: wrap;
    gap: 0.6rem;
    row-gap: 0.25rem;
    padding-bottom: 0.3rem;
  }

  .brand {
    margin-right: auto;
  }

  /* The links get a row of their own and scroll sideways; the faded edge says there are more. */
  .links {
    order: 1;
    flex-basis: 100%;
    mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);
  }

  .links.scrolled {
    mask-image: linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), transparent);
  }

  .links a:last-child {
    margin-right: 2rem;
  }

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
