import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function swHeadersPlugin() {
  const setHeaders = (req, res, next) => {
    if (req.url === '/sw.js') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Content-Type', 'application/javascript')
    } else if (req.url === '/manifest.webmanifest') {
      res.setHeader('Content-Type', 'application/manifest+json')
    }
    next()
  }
  return {
    name: 'sw-headers-plugin',
    configureServer(server) {
      server.middlewares.use(setHeaders)
    },
    configurePreviewServer(server) {
      server.middlewares.use(setHeaders)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swHeadersPlugin()],
  server: {
    proxy: {
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
