# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-04-05

### Soporte multiplataforma (Windows)

- Barra de titulo adaptativa: traffic lights nativos en macOS, botones custom (minimizar/maximizar/cerrar) en Windows
- Deteccion automatica de plataforma (`darwin` / `win32`)
- Ventana `frame: false` en Windows con botones integrados en la UI
- User agent de Chrome adaptado por SO para compatibilidad con servicios web
- Icono por plataforma (`.icns` macOS, `.ico` Windows)
- Menu condicional: app menu solo en macOS, boton cerrar en Windows
- IPC handlers para controles de ventana: `window-minimize`, `window-maximize`, `window-close`
- Componente `MacTitleBar` renombrado a `TitleBar` con prop `platform`
- Scripts de empaquetado: `dist:win`, `dist:win-arm64`
- Configuracion de instalador Windows (NSIS)
- Cross-compilation desde macOS

### Build

- Actualizado `electron-builder` a v26.8.1
- Eliminada opcion `generateBlockmap` (no soportada en v26, blockmaps se generan por defecto)

## [0.2.0] - 2026-04-05

### Build
- Scripts de empaquetado por arquitectura: `dist:arm64`, `dist:x64`, `dist:universal`
- Genera tanto `.dmg` como `.zip` para cada arquitectura
- Version actualizada a 0.2.0

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
