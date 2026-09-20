# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-09-20

### Codex

- Nuevo boton **Launch Codex** por cuenta: abre `chatgpt.com/codex` en la misma particion aislada que ChatGPT, sin volver a iniciar sesion
- Cada cuenta puede tener abiertas a la vez una ventana de ChatGPT y otra de Codex; los botones cambian a "Focus" cuando la ventana ya existe
- Indicador de workspaces abiertos en el sidebar (punto verde) y en el detalle de cuenta; el proceso principal notifica al renderer via `open-workspaces-changed`
- El renderer ya no envia URLs al proceso principal: solo la clave del destino (`chatgpt` / `codex`), que main.js resuelve

### Fixed

- **Borrar una cuenta ahora borra su sesion**: se cierran sus ventanas y se limpian cookies, storage y cache de la particion (`clear-account-session`). Antes solo se eliminaba el registro y el login quedaba en disco
- **User agent en la sesion**: el UA de Chrome se fija con `session.setUserAgent` en vez de solo en el `webContents`, de modo que los popups de login (Google, Apple, GitHub) tambien lo heredan
- **Enlaces externos en los workspaces**: las ventanas hijas tienen `setWindowOpenHandler`; solo los dominios de OpenAI y de los proveedores de login (y las rutas OAuth de GitHub) se abren dentro de la app, el resto va al navegador del sistema
- **macOS: recuperar la ventana principal**: si se cerraba con workspaces abiertos, el clic en el Dock no la reabria. `activate` ahora comprueba si `mainWindow` sigue viva
- **Handlers de ventana** (`window-minimize/maximize/close`) protegidos contra una ventana principal ya destruida
- **Icono de Windows**: `main.js` y `package.json` apuntaban a `icons.ico`; el archivo es `icon.ico`. Los iconos ahora se incluyen en `build.files`
- **CSS inexistente**: eliminado el `<link>` a `/index.css` en `index.html` (404 en dev, peticion fallida en produccion)
- **Pista de menu en Windows**: el texto "Menu: Window > cuenta" solo se muestra en macOS, donde existe ese menu

### Changed

- Placeholder de notas y textos de ayuda actualizados para mencionar Codex
- Version 0.4.0

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
