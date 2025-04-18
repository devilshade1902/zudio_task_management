import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Replace with your Express backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
