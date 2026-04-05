# Empaquetado y distribucion

Guia para generar los instalables de GPT Switcher para macOS y Windows.

## Requisitos previos

- Node.js 18+
- npm 9+
- macOS o Windows (para compilacion nativa; cross-compilation parcial desde macOS)

## Arquitecturas

macOS tiene dos arquitecturas de procesador:

| Arquitectura | Procesador | Macs |
|---|---|---|
| `arm64` | Apple Silicon | M1, M2, M3, M4 y posteriores |
| `x64` | Intel | MacBook/iMac/Mac Pro anteriores a 2020 |

### Saber tu arquitectura

```bash
uname -m
```

- `arm64` → Apple Silicon
- `x86_64` → Intel

## Comandos de empaquetado

### macOS

```bash
npm run dist          # Ambas arquitecturas (arm64 + x64)
npm run dist:arm64    # Solo Apple Silicon (M1/M2/M3/M4)
npm run dist:x64      # Solo Intel
npm run dist:universal # Binario universal
```

Cada comando genera tanto `.dmg` como `.zip` para la arquitectura seleccionada.

### Windows

```bash
npm run dist:win       # Windows x64
npm run dist:win-arm64 # Windows ARM
```

Genera un instalador `.exe` (NSIS).

## Salida

Los artefactos se generan en `dist-electron/`:

```
dist-electron/
├── GPT Switcher-0.3.0-arm64.dmg   # DMG para Apple Silicon
├── GPT Switcher-0.3.0-arm64.zip   # ZIP para Apple Silicon
├── GPT Switcher-0.3.0.dmg         # DMG para Intel
├── GPT Switcher-0.3.0.zip         # ZIP para Intel
├── mac-arm64/
│   └── GPT Switcher.app           # App directa para ARM
└── mac/
    └── GPT Switcher.app           # App directa para Intel
```

El `.zip` contiene el `.app` listo para usar — el usuario lo descomprime y lo ejecuta (o lo arrastra a `/Applications`). El `.dmg` es la alternativa clasica con la ventana de "arrastra aqui". Para releases en GitHub, el `.zip` es lo mas practico.

## Configuracion del empaquetado

La configuracion de `electron-builder` esta en `package.json` bajo la clave `"build"`:

```json
{
  "build": {
    "appId": "com.gptswitcher.app",
    "mac": {
      "category": "public.app-category.productivity",
      "target": {
        "target": "dmg",
        "arch": ["arm64", "x64"]
      },
      "icon": "icon.icns"
    },
    "compression": "maximum",
    "asar": true
  }
}
```

### Opciones clave

**`compression`** — Nivel de compresion del paquete ASAR:
- `"store"` — Sin compresion. Build rapido, archivo grande. Util para pruebas.
- `"normal"` — Equilibrio entre tamano y velocidad de build.
- `"maximum"` — Maxima compresion. Build mas lento pero archivo mas pequeno. Recomendado para distribucion.

**`asar`** — Empaqueta los archivos de la app en un unico archivo `.asar`:
- `true` (recomendado) — Mejor rendimiento de lectura, protege los archivos fuente.
- `false` — Los archivos quedan sueltos dentro del `.app`. Util para depuracion.

**`target`** — Formato de salida:
- `"dmg"` — Imagen de disco estandar de macOS (lo habitual para distribucion).
- `"zip"` — Archivo ZIP. Mas ligero, util para distribucion automatizada.
- `"dir"` — Solo genera el `.app` sin empaquetarlo. Util para pruebas rapidas.

**`arch`** — Arquitecturas objetivo:
- `["arm64"]` — Solo Apple Silicon.
- `["x64"]` — Solo Intel.
- `["arm64", "x64"]` — Ambas por separado (un DMG cada una).

**`category`** — Categoria en la App Store / Finder:
- `"public.app-category.productivity"` es la mas adecuada para este tipo de app.

## Icono de la aplicacion

macOS requiere el formato `.icns` para iconos de app. Este archivo contiene multiples resoluciones del mismo icono empaquetadas juntas.

### Crear el icono desde una imagen PNG

Necesitas un PNG de al menos **1024x1024 px** como imagen base. A partir de ahi:

#### Opcion 1: Usando `iconutil` (incluido en macOS)

```bash
# 1. Crear directorio con las resoluciones requeridas
mkdir icon.iconset

# 2. Generar cada tamano
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png

# 3. Convertir el iconset a .icns
iconutil -c icns icon.iconset -o icon.icns

# 4. Limpiar
rm -rf icon.iconset
```

`sips` viene preinstalado en macOS, no necesitas ImageMagick.

#### Opcion 2: Usando una herramienta online

Sube tu PNG a un conversor como [CloudConvert](https://cloudconvert.com/png-to-icns) o [iConvert Icons](https://iconverticons.com/online/) y descarga el `.icns`.

### Resoluciones requeridas

macOS usa distintos tamanos segun el contexto:

| Tamano | Uso |
|---|---|
| 16x16 | Barra de menus, listas de Finder |
| 32x32 | Finder en vista lista |
| 128x128 | Finder en vista iconos pequenos |
| 256x256 | Finder en vista iconos medianos |
| 512x512 | Finder en vista iconos grandes |
| 1024x1024 | App Store, vista Coverflow, Retina |

Cada tamano tiene variante `@2x` (doble de pixeles) para pantallas Retina.

### Consejos de diseno

- Usa un fondo solido o con degradado — los fondos transparentes se ven mal en el Dock sobre fondos claros.
- Respeta la forma redondeada (squircle) que macOS aplica automaticamente — no anadeas bordes redondeados propios.
- Asegurate de que el icono sea legible a 16x16 — simplifica detalles para las resoluciones pequenas.
- Prueba el icono tanto en modo claro como oscuro de macOS.

## Firma de codigo (opcional)

Sin firma, macOS mostrara un aviso de "desarrollador no identificado" al abrir la app. Para uso personal esto es aceptable — simplemente abre la app con clic derecho > Abrir la primera vez.

Para distribucion publica, necesitas un Apple Developer ID ($99/ano):

```bash
# Exportar identidad de firma
export CSC_NAME="Developer ID Application: Tu Nombre (TEAMID)"

# Empaquetar con firma
npm run dist
```

electron-builder detecta automaticamente la identidad y firma el `.app` y `.dmg`.

## Solucionar "app danada" al abrir

Si macOS dice que la app "esta danada y no puede abrirse" (comun en apps sin firma descargadas):

```bash
xattr -cr /ruta/a/GPT\ Switcher.app
```

Esto elimina los atributos de cuarentena que macOS agrega a archivos descargados.

## Tamanos de referencia

| Formato | Tamano aprox. |
|---|---|
| `.dmg` (arm64) | ~96 MB |
| `.zip` (arm64) | ~101 MB |
| `.dmg` (x64) | ~101 MB |
| `.zip` (x64) | ~107 MB |

Los tamanos son aproximados y dependen de la version de Electron.

---

## Distribucion para Windows

### Icono para Windows

Windows usa formato `.ico` (256x256 px minimo, idealmente multi-resolucion).

**Desde un PNG:**

```bash
# Opcion 1: Usando ImageMagick (brew install imagemagick)
convert icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 icons.ico

# Opcion 2: Herramientas online
# https://convertio.co/png-ico/
# https://icoconvert.com/
```

Coloca `icons.ico` en la raiz del proyecto. Ya esta configurado en `package.json`.

### Configuracion del instalador (NSIS)

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- `"oneClick": false` — Muestra un wizard de instalacion (el usuario puede elegir directorio).
- `"allowToChangeInstallationDirectory": true` — Permite al usuario elegir donde instalar.

### Cross-compilation desde macOS

electron-builder puede generar `.exe` desde macOS:

```bash
npm run dist:win
```

Limitaciones:
- **Firma de codigo**: requiere Windows + certificado EV. Sin firma, SmartScreen mostrara un aviso al instalar.
- **Pruebas**: el `.exe` generado deberia probarse en una maquina Windows real o VM.

### Suprimir aviso de SmartScreen

Sin firma, al abrir el `.exe` Windows mostrara "Windows protegió su equipo". El usuario debe hacer clic en "Mas informacion" → "Ejecutar de todas formas".

### Diferencias de la app en Windows

| Aspecto | macOS | Windows |
|---|---|---|
| Barra de titulo | `hiddenInset` (traffic lights nativos) | `frame: false` (botones custom: minimizar, maximizar, cerrar) |
| Icono | `.icns` | `.ico` |
| Atajos | `Cmd+1-9`, `Cmd+N` | `Ctrl+1-9`, `Ctrl+N` |
| User agent | macOS Chrome | Windows Chrome |
| Instalador | `.dmg` / `.zip` | `.exe` (NSIS) |

## Archivos incluidos en el build

El `package.json` define que archivos se incluyen en el `.app`:

```json
"files": [
  "dist/**/*",
  "main.js",
  "preload.js",
  "package.json"
]
```

Los archivos fuente (`.ts`, `.tsx`) se excluyen automaticamente — solo se incluye el bundle compilado (`dist/`), el proceso principal (`main.js`), el bridge de IPC (`preload.js`) y los metadatos (`package.json`).
