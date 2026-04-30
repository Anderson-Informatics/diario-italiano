// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['@/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  tailwindcss: {
    configPath: './tailwind.config.js',
    exposeConfig: false
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    mongodbUri: process.env.MONGO_URI || 'mongodb://localhost:27017/italian_journal'
  },
  app: {
    head: {
      title: 'Italian Daily Journal',
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: ''
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Patrick+Hand&display=swap'
        }
      ]
    }
  }
})