import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 🟢 1. บังคับเสก HTTPS
  ],
  server: {
    host: true,
    proxy: {
      // 🟢 2. มุดท่อ API: เมื่อหน้าเว็บเรียก /jhcis-api ให้ส่งไปที่เซิร์ฟเวอร์หลังบ้าน
      '/jhcis-api': {
        target: 'http://26.62.30.1:3000', // ⚠️ เปลี่ยนเลข IP นี้เป็น IP ของเครื่องที่รัน Node.js API อยู่นะครับ
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jhcis-api/, '/api')
      }
    }
  }
})