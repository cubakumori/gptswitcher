# GPT Switcher

A native macOS desktop application for managing and switching between multiple ChatGPT accounts efficiently. Each account runs in its own isolated environment with persistent sessions, allowing seamless switching without the hassle of logging in and out.

## Features

- **Multiple Account Management**: Add and manage multiple ChatGPT accounts with custom names, emails, and color-coded avatars
- **Isolated Sessions**: Each account runs in a completely isolated persistent partition with separate cookies and login sessions
- **One-Click Workspace Launch**: Launch ChatGPT workspaces instantly without re-authenticating
- **Persistent Storage**: Account data and sessions are automatically saved between app restarts
- **Native macOS Experience**: Clean, modern interface with macOS-style title bar and design
- **Session Notes**: Add custom notes and instructions for each account to remember usage guidelines or preferences
- **Window Management**: Multiple workspace windows can be open simultaneously, managed through the macOS Window menu

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Desktop Framework**: Electron
- **Build Tool**: Vite
- **UI Icons**: Lucide React
- **Styling**: Tailwind CSS (utility classes)

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd gpt-switcher-mac
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the app in development mode:

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` and launches the Electron window.

## Building

### Create a production build:

```bash
npm run build
```

### Build distributable:

```bash
npm run dist
```

This creates a `.dmg` installer for macOS in the `dist` folder.

## Usage

### Adding an Account

1. Click the "+" button in the sidebar
2. Enter the account name (e.g., "Work Account", "Personal")
3. Enter the associated email address
4. Choose an avatar color
5. Optionally add notes about the account usage
6. Click "Add Account"

### Launching a Workspace

1. Select an account from the sidebar
2. Click the "Launch Workspace" button
3. A new isolated browser window opens with ChatGPT
4. Log in with your credentials (only needed first time)
5. The session persists across app restarts

### Managing Accounts

- **Switch Accounts**: Click on any account in the sidebar
- **Delete Account**: Click the trash icon next to an account
- **Edit Notes**: Update session notes in the account detail view
- **View History**: See when each account was last used

### Window Management

Open workspace windows appear in the macOS "Window" menu as "{Account Name}". You can:
- Have multiple workspaces open simultaneously
- Switch between workspaces using the Window menu
- Each workspace maintains its own isolated session

## Architecture

### Project Structure

```
.
├── App.tsx                      # Main application component
├── components/
│   ├── AccountDetail.tsx        # Account details and launch interface
│   ├── AddAccountForm.tsx       # Form for adding new accounts
│   ├── MacTitleBar.tsx          # Native macOS-style title bar
│   └── Sidebar.tsx              # Account list sidebar
├── services/
│   └── storageService.ts        # LocalStorage persistence layer
├── types.ts                     # TypeScript type definitions
├── main.js                      # Electron main process
├── index.tsx                    # React entry point
└── index.html                   # HTML template
```

### Key Components

**App.tsx**
- Central state management for accounts
- View state coordination (list, add, edit)
- Account CRUD operations
- Persistence orchestration

**AccountDetail.tsx**
- Display account information
- Launch isolated workspace via IPC
- Session notes editor
- Last used tracking

**Sidebar.tsx**
- Account list with search/filter
- Quick account switching
- Add/delete account actions

**main.js** (Electron Main Process)
- Window creation and management
- IPC handlers for workspace launching
- Menu bar setup (App, Edit, Window menus)
- Partition-based session isolation

### Session Isolation

Each account uses Electron's `partition` feature to create completely isolated browser sessions:

```javascript
partition: `persist:${accountId}`
```

This ensures:
- Separate cookies
- Independent local storage
- Isolated cache
- No cross-contamination between accounts

### Data Persistence

Account data is stored in browser `localStorage`:
- Account metadata (name, email, avatar color)
- Last used timestamps
- Custom notes
- Active state

Session data (cookies, login state) is stored in Electron's partition storage.

## Configuration

### Build Configuration

The `package.json` includes electron-builder configuration:

```json
{
  "build": {
    "appId": "com.gptswitcher.app",
    "mac": {
      "category": "public.app-category.productivity",
      "target": "dmg",
      "icon": "icon.icns"
    }
  }
}
```

### Customization

- **Avatar Colors**: Edit `AVATAR_COLORS` array in `types.ts`
- **Default URL**: Modify the ChatGPT URL in `AccountDetail.tsx:55`
- **Window Dimensions**: Adjust in `main.js:57-58` (main) and `main.js:103-104` (workspace)

## Security Considerations

- **Node Integration**: Currently enabled for IPC communication. Consider using `contextBridge` for production
- **External Links**: Automatically open in system browser for security
- **Session Isolation**: Each account runs in isolated partition preventing cross-account data leakage

## Known Limitations

- macOS only (electron-builder configured for macOS target)
- No built-in account import/export
- No cloud sync between devices
- Workspace windows title locked to account name (prevents ChatGPT from changing it)

## Future Enhancements

Potential improvements:
- Cross-platform support (Windows, Linux)
- Account import/export functionality
- Keyboard shortcuts for quick account switching
- Custom workspace URLs per account
- Usage analytics and session time tracking
- Account grouping and tagging

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]

## Support

For issues, feature requests, or questions, please [open an issue](link-to-issues) on GitHub.
