# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.2] - 2026-09-20

### Fixed

- **Login con Google, segundo intento.** Presentar Chrome de forma coherente (0.6.1) no fue suficiente: Google bloquea a los motores Chromium que no son Chrome aunque UA y Client Hints coincidan. La solucion que mantiene qutebrowser (QtWebEngine, mismo problema, confirmada por usuarios en 2025 y 2026) es presentar **Firefox unicamente en `accounts.google.com`**, que no envia Client Hints y por tanto no da a Google nada que contrastar. Ahora:
  - Las peticiones a `accounts.google.com` llevan User-Agent de Firefox 156 y ninguna cabecera `Sec-CH-UA`
  - `navigator.userAgent` del workspace cambia a Firefox al navegar o ser redirigido a ese host y vuelve a Chrome al salir (`trackIdentity`, tambien en los popups de login)
  - El preload no parchea `navigator.userAgentData` en ese host
  - El resto de sitios (ChatGPT, Codex, auth.openai.com, GitHub) siguen viendo Chrome con Client Hints coherentes
- **Scripts de empaquetado por arquitectura**: `dist:arm64` y `dist:x64` compilaban las dos arquitecturas porque `build.mac.target` fijaba `arch` en la configuracion. Ahora la arquitectura la decide el flag del script; `npm run dist` pasa `--arm64 --x64`
- Anadido `author` en package.json (electron-builder avisaba de su ausencia)

### Tests

- El smoke test resuelve `accounts.google.com` al servidor https local (`--host-resolver-rules`, solo en la prueba) y comprueba que ese host recibe Firefox sin Client Hints y que `localhost` sigue recibiendo Chrome, tanto en cabeceras como en `navigator.userAgent`, en la misma ventana

## [0.6.1] - 2026-09-20

### Fixed

- **Login con Google bloqueado** ("Es posible que el navegador o la aplicacion no sean seguros"). Causa: el User-Agent ya se presentaba como Chrome, pero los Client Hints seguian delatando a Electron. Con el UA sobrescrito, Chromium deja de enviar las cabeceras `Sec-CH-UA` y `navigator.userAgentData` solo anuncia la marca "Chromium", una combinacion que Google trata como navegador embebido. Ahora:
  - La sesion de cada particion anade o reescribe `Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform` y `Sec-CH-UA-Full-Version-List` en las peticiones https con las marcas de Chrome real (`Chromium`, `Google Chrome`, version de Chromium de Electron)
  - Nuevo `workspace-preload.js` en las ventanas de workspace y sus popups: expone `navigator.userAgentData` con esas mismas marcas via `contextBridge.executeInMainWorld`, sin abrir ninguna API a la pagina
- Configuracion de sesion (UA + cabeceras) centralizada en `configureWorkspaceSession`, una sola vez por particion

### Tests

- `npm test` levanta un servidor https local con certificado efimero de confianza (hash SPKI) y comprueba que una ventana de workspace envia `Sec-CH-UA` con la marca `Google Chrome` y que el JavaScript de la pagina ve las mismas marcas

## [0.6.0] - 2026-09-20

### Added

- **Icono en la bandeja / barra de menus**: lista las cuentas con "Launch/Focus ChatGPT" y "Launch/Focus Codex", muestra la ventana principal y permite activar o desactivar los atajos globales. Icono template monocromo en macOS (`trayTemplate.png`), `icon.ico` en Windows
- **Atajos globales** (activados por defecto, desactivables desde la bandeja): `Cmd/Ctrl+Alt+1-9` abre o enfoca ChatGPT de la cuenta N, `Cmd/Ctrl+Alt+0` muestra GPT Switcher. Funcionan aunque la app no tenga el foco
- **Editar cuenta**: boton lapiz junto al nombre para cambiar nombre, email y color sin perder la sesion. Reutiliza el formulario de alta en modo edicion
- **`npm test`**: smoke test del proceso principal (`test/smoke.js`) que arranca la app con un `userData` temporal y comprueba allowlist de enlaces, saneado del store, ajustes, `CODEX_HOME`, apertura y cierre de workspaces, limpieza de sesion y persistencia de la ventana
- Ajustes persistidos en `accounts.json` (`settings.globalShortcuts`)

### Fixed

- **Menu Window en macOS**: el submenu lleva `role: 'window'`, necesario para que el sistema anada la lista de ventanas abiertas. Sin el, la pista "Menu: Window > cuenta" no se cumplia
- **Atajo en Windows**: el sidebar mostraba `⌘1` tambien en Windows; ahora muestra `Ctrl+1`

## [0.5.0] - 2026-09-20

### Codex CLI e IDE

- Cada cuenta tiene su propio `CODEX_HOME` en `<userData>/codex/<id>` con un `config.toml` que fija `cli_auth_credentials_store = "file"`, de modo que la CLI de Codex y la extension del IDE pueden estar logueadas con cuentas distintas
- Nueva tarjeta **Codex CLI & IDE** en el detalle de cuenta: muestra el comando, lo copia al portapapeles o abre una terminal (Terminal.app en macOS, PowerShell en Windows) con la variable ya exportada
- Al borrar una cuenta tambien se elimina su `CODEX_HOME`

### Persistencia

- Las cuentas se guardan en `<userData>/accounts.json` gestionado por el proceso principal (`store.js`), con escritura atomica y saneado de campos. El renderer ya no usa localStorage
- Migracion automatica: la primera vez que arranca sin fichero, importa las cuentas del localStorage antiguo y lo limpia
- Se persiste la cuenta seleccionada (`activeAccountId`); eliminado el campo redundante `isActive`
- La ventana principal recuerda posicion y tamano entre arranques (se valida contra la pantalla disponible)

### Build y seguridad

- Tailwind pasa del CDN a `@tailwindcss/vite` (v4): CSS compilado en el bundle, sin peticiones de red al arrancar ni compilador JIT en el renderer
- Eliminada la carga de Inter desde Google Fonts; se usa la fuente del sistema
- Content-Security-Policy en el build de produccion (`script-src 'self'`, sin conexiones externas) inyectada por un plugin de Vite
- Actualizados Electron 39 → 44, Vite 7 → 8, React 18 → 19, lucide-react 0.300 → 1.x, electron-builder y TypeScript
- `vite.config.ts` renombrado a `.mts`; `engines.node >= 22.12`
- Eliminado `metadata.json`, resto del scaffold de AI Studio

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
