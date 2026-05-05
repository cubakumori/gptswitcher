# GPT Switcher

App de escritorio multiplataforma (macOS y Windows) para gestionar y alternar entre multiples cuentas de ChatGPT. Cada cuenta se ejecuta en un entorno aislado con sesiones persistentes, eliminando la necesidad de iniciar y cerrar sesion constantemente.

## Disclaimer

**This software is provided "as is", without warranty of any kind. Use it at your own risk. The authors and contributors shall not be held liable for any claim, damages, or other liability arising from the use of this application, including issues related to macOS, Node.js, Electron, or account/session handling.**

## Funcionalidades

- **Gestion de multiples cuentas**: agrega y gestiona varias cuentas de ChatGPT con nombres, emails y avatares con color
- **Sesiones aisladas**: cada cuenta se ejecuta en una particion persistente con cookies y sesiones independientes
- **Lanzamiento en un clic**: abre workspaces de ChatGPT sin necesidad de re-autenticarte
- **Persistencia**: datos de cuenta y sesiones se guardan automaticamente entre reinicios
- **Multiplataforma**: macOS (traffic lights nativos) y Windows (barra de titulo custom con botones minimizar/maximizar/cerrar)
- **Notas de sesion**: campo de texto libre para apuntes por cuenta
- **Gestion de ventanas**: multiples workspaces abiertos simultaneamente, accesibles desde el menu Window
- **Atajos de teclado**: `Cmd/Ctrl+1-9` para cambiar de cuenta, `Cmd/Ctrl+N` para agregar
- **Seguridad**: comunicacion IPC via `preload.js` con `contextBridge` (sin `nodeIntegration`)

## Stack

- **Electron** — app de escritorio con aislamiento via particiones
- **React 18** + **TypeScript** — UI
- **Vite** — bundler y dev server
- **Tailwind CSS** (CDN) — estilos
- **Lucide React** — iconos

## Instalacion

```bash
npm install
```

## Uso

### Desarrollo (con hot-reload)

```bash
npm run dev
```

Lanza Vite en `http://localhost:5173` y Electron se conecta automaticamente.

### Produccion (build + ejecutar)

```bash
npm run build
```

### Empaquetar

```bash
npm run dist          # macOS ambas arquitecturas (arm64 + x64)
npm run dist:arm64    # macOS solo Apple Silicon (M1/M2/M3/M4)
npm run dist:x64      # macOS solo Intel
npm run dist:universal # macOS binario universal
npm run dist:win       # Windows x64
npm run dist:win-arm64 # Windows ARM
```

Genera `.dmg`, `.zip` y/o `.exe` en `dist-electron/`. Para mas detalles sobre arquitecturas, firma e iconos, ver [BUILDING.md](BUILDING.md).

## Estructura del proyecto

```
gptswitcher/
├── main.js                  # Proceso principal de Electron
├── preload.js               # Bridge seguro de IPC (contextBridge)
├── App.tsx                  # Componente raiz de React
├── types.ts                 # Interfaces y tipos TypeScript
├── index.html               # Entry point
├── index.tsx                # Mount de React
├── components/
│   ├── TitleBar.tsx         # Barra de titulo multiplataforma (macOS/Windows)
│   ├── Sidebar.tsx          # Lista de cuentas con scroll
│   ├── AccountDetail.tsx    # Detalle de cuenta + boton "Launch Workspace"
│   └── AddAccountForm.tsx   # Formulario de alta
└── services/
    └── storageService.ts    # Persistencia en localStorage
```

## Como funciona el aislamiento

Cada cuenta recibe un UUID unico al crearse. Cuando se abre, Electron crea una ventana con:

```js
webPreferences: {
  partition: `persist:${account.id}`
}
```

Esto garantiza que cada cuenta tenga cookies, localStorage, IndexedDB y cache completamente independientes. Puedes tener varias cuentas de ChatGPT abiertas simultaneamente, cada una con su propio login.

## Seguridad

- **Context isolation**: la ventana principal usa `contextIsolation: true` y `nodeIntegration: false`
- **Preload bridge**: solo se exponen funciones especificas via `contextBridge` (`openIsolatedBrowser`, `getPlatform`, window controls)
- **Enlaces externos**: se abren automaticamente en el navegador del sistema
- **DevTools**: solo disponibles en modo desarrollo
- **Ventanas hijas**: usan `nodeIntegration: false` y `contextIsolation: true` por defecto

## Apoyar el proyecto

Si **GPT Switcher** te ha resultado de alguna utilidad, considera invitarme a un café:

[![PayPal](https://img.shields.io/badge/PayPal-Donar-blue?style=for-the-badge&logo=paypal)](https://paypal.me/ernestortiz)

[![Ko-fi](https://img.shields.io/badge/BUY_ME_A-KO_FI-darkseagreen?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/kumoricuba)


## Licencia

MIT
