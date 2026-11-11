import { defineConfig } from 'vite';

// base relativa: el juego compilado funciona desde cualquier carpeta (itch.io, GitHub Pages).
// El vigilante ignora .test (perfiles temporales de navegador de las pruebas) y dist: miles de archivos
// cambiando ahí dentro lo saturaban y el servidor de desarrollo dejaba de responder.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  server: { watch: { ignored: ['**/.test/**', '**/dist/**'] } },
});
