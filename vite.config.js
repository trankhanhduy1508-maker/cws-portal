import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Chỉ chạy test của Frontend (src/) — backend/ dùng Jest riêng
    // (backend/package.json), KHÔNG để Vitest tự động nhặt nhầm file
    // *.spec.ts của NestJS (globals kiểu Jest, khác Vitest).
    include: ['src/**/*.test.{js,jsx}'],
  },
})
