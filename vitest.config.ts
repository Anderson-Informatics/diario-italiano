import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
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