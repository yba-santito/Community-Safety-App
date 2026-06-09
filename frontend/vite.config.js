import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Make sure to import path

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This FORCES every single package to use your exact local React copy
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  },
  server: {
    proxy: {
      // Intercept any local request starting with /api and send it to Express
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build', 
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts']
  }
})