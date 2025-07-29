import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1234,
    host: '0.0.0.0', // ネットワーク内の他のデバイスからアクセス可能
    strictPort: true, // ポートが使用中の場合はエラーで停止
    open: true
  }
})
