import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    server: {
      deps: {
        inline: ['@nuxt']
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})