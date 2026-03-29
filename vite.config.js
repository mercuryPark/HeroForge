import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': '/src',
      '@data': '/src/data',
      '@core': '/src/core',
      '@components': '/src/components',
      '@systems': '/src/systems',
      '@render': '/src/render',
      '@ui': '/src/ui',
    }
  },
  test: {
    globals: true,
    environment: 'node',
  }
})
