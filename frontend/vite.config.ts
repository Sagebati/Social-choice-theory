/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// During development the API runs under `wrangler dev` on port 8787.
const api = { '/api': 'http://127.0.0.1:8787' }

export default defineConfig({
  plugins: [vue()],
  define: {
    // vue-i18n: the Composition API only, with <i18n-t> available everywhere.
    __VUE_I18N_LEGACY_API__: false,
    __VUE_I18N_FULL_INSTALL__: true,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  server: { proxy: api },
  preview: { proxy: api },
  test: {
    // The locale test globs every source file; a cached transform would miss
    // files added since.
    fsModuleCache: false,
  },
})
