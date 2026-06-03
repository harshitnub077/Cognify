import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tabler/icons-react',
      'lucide-react',
      'recharts',
      'framer-motion',
      '@supabase/supabase-js',
      'react-hot-toast'
    ]
  }
})
