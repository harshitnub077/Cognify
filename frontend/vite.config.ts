import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tabler/icons-react',
      'recharts',
      'framer-motion',
      '@supabase/supabase-js',
      'react-hot-toast'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor';
          }
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          if (id.includes('node_modules/@tabler/icons-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/@supabase')) {
            return 'utils';
          }
        }
      }
    }
  }
})
