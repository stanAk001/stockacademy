import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split big third-party libs off the main bundle so the initial load is
        // small and heavy tools (chart/canvas/markdown) load only when used.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('html2canvas')) return 'html2canvas';
          if (id.includes('framer-motion') || id.includes('popmotion') || id.includes('@motionone')) return 'motion';
          if (id.includes('lightweight-charts') || id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') ||
              id.includes('mdast') || id.includes('hast') || id.includes('dompurify') ||
              id.includes('property-information') || id.includes('unist')) return 'markdown';
          // react core must sit with react-dom: react-dom reads React's internals
          // at load time, and with react in 'vendor' (which imports 'markdown',
          // which imports 'vendor') that read could run before React existed.
          if (id.includes('/node_modules/react/') || id.includes('/react-dom/') || id.includes('/scheduler/') ||
              id.includes('/react-router') || id.includes('/@remix-run/router/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
