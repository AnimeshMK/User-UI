// vite.config.js (UPDATED - Ensure public assets are copied)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ensures that assets from the public directory are copied to the output directory
    // This is typically default behavior, but explicitly setting it can help resolve issues.
    // If you had a custom public directory, you'd define it here: publicDir: 'path/to/my-public-assets'
    // For now, we'll ensure default behavior.
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
