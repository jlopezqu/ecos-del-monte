import { defineConfig } from 'vite';

// base relativa: el juego compilado funciona desde cualquier carpeta (itch.io, GitHub Pages).
export default defineConfig({ base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1200 } });
