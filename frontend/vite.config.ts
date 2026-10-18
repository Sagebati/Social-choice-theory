import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// During development the API runs under `wrangler dev` on port 8787.
const api = { '/api': 'http://127.0.0.1:8787' }

export default defineConfig({
  plugins: [vue()],
  server: { proxy: api },
  preview: { proxy: api },
})
