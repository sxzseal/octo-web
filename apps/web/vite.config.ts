import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import commonjs from 'vite-plugin-commonjs'

export default defineConfig({
  plugins: [
    // TODO: remove after all require() calls are migrated to import (chore/migrate-require-to-import)
    commonjs(),
    react(),
    tsconfigPaths({ root: '../../' }),
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': 'import.meta.env.MODE',
    'process.env.PUBLIC_URL': '""',
  },
  envPrefix: 'VITE_',
})
