import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// CSP solo en el build de produccion: en dev, Vite y React Refresh necesitan scripts inline.
// Con Tailwind compilado y fuentes del sistema, el renderer no carga nada externo.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'gptswitcher-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  // 'base: ./' es OBLIGATORIO para Electron.
  // Convierte las rutas absolutas (/assets/...) en relativas (./assets/...)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
