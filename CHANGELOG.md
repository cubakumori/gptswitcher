# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-04-05

### Fixed
- **Traffic lights duplicados**: eliminados los botones falsos (circulos rojo/amarillo/verde) de `MacTitleBar` que se superponian a los traffic lights nativos de macOS. Ahora solo se reserva espacio para los nativos via `titleBarStyle: 'hiddenInset'`
- **Script duplicado en HTML**: eliminada la segunda carga de `index.tsx` (ruta absoluta `/index.tsx`) que causaba doble montaje de React
- **Sidebar overflow**: la lista de cuentas ahora es scrolleable cuando hay muchas cuentas (`overflow-y-auto`)

### Security
- **Preload bridge**: nuevo `preload.js` con `contextBridge` que expone solo `electronAPI.openIsolatedBrowser()` y `getPlatform()`
- **Context isolation**: cambiado a `contextIsolation: true` y `nodeIntegration: false` en la ventana principal
- **DevTools**: desactivados en produccion (`devTools: !app.isPackaged`)
- **IPC migrado**: `AccountDetail.tsx` ya no usa `window.require('electron')`, usa `window.electronAPI` tipado

### Removed
- Import map de CDN sin usar (`react`, `react-dom`, `lucide-react`, `vite` desde `aistudiocdn.com`) en `index.html`
- Declaracion global `window.require: any` en `types.ts`

---

## [0.1.0] - 2025-02-15

### Added
- Initial public release of **GPT Switcher**
- Multi-account management interface
- Isolated Electron partitions for persistent sessions
- One-click workspace launching
- macOS-native UI layout and title bar
- Session notes and last-used timestamps
- Persistent storage for account metadata
- Basic window management via macOS "Window" menu

### Known Limitations
- macOS only
- No account import/export
- No cloud sync
- Workspace window title locked to account name
