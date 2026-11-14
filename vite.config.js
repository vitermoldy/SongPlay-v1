import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

// The server (npm run server) keeps play history and a copy of the queue in MySQL; dev forwards /api to it.
const api = { '/api': { target: `http://localhost:${process.env.PORT ?? 8792}` } };

export default defineConfig({
  // Relative asset paths, so the built site works from any folder or static host.
  base: './',
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: page('./index.html'),
        player: page('./player.html'),
      },
    },
  },
});
