import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Build otimizado para landing estática (preview com `npm run preview`). */
  build: {
    target: 'es2022',
    sourcemap: false,
  },
})
