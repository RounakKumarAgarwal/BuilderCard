import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." = "src/...", the import style Vengeance UI components expect
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
