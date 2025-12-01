import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base: ./' es OBLIGATORIO para Electron. 
  // Convierte las rutas absolutas (/assets/...) en relativas (./assets/...)
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});