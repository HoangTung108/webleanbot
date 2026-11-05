import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/webleanbot/' : '/',
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true }, '/ws': { target: 'ws://127.0.0.1:8080', ws: true } } },
  build: { rollupOptions: { output: { manualChunks: { monaco: ['monaco-editor', '@monaco-editor/react'], blockly: ['blockly/core', 'blockly/blocks'] } } } },
})
