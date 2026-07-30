import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const indexHtml = fileURLToPath(new URL('./index.html', import.meta.url))
const weeklyPreviewHtml = fileURLToPath(new URL('./weekly-preview.html', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: indexHtml,
        weeklyPreview: weeklyPreviewHtml
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
