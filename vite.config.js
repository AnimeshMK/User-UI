// vite.config.js (UPDATED - Explicitly set publicDir)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Explicitly set the public directory. This is the default,
    // but stating it can sometimes help Vite correctly copy assets.
    publicDir: 'public',
    // Ensures that assets from the public directory are copied to the output directory
    // This is typically default behavior, but explicitly setting it can help resolve issues.
  },
  server: {
    // Set a port for local development
    port: 3000
  },
  // If your project is deployed to a sub-path, you might need a base URL:
  // base: '/your-repo-name/'
  // But for direct hosting on Vercel/Firebase, usually it's '/'
  base: '/'
})
