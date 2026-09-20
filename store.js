// Persistencia de la app en el proceso principal: <userData>/accounts.json
// El renderer ya no guarda nada en localStorage; asi main.js conoce las cuentas
// (menus, ventanas, CODEX_HOME) y los datos sobreviven a limpiezas del renderer.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE_VERSION = 1;
const AVATAR_COLOR_RE = /^bg-[a-z]+-500$/;

let cache = null;

function filePath() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

const DEFAULT_SETTINGS = { globalShortcuts: true };

function emptyState() {
  return { version: FILE_VERSION, accounts: [], activeAccountId: null, windowBounds: null, settings: { ...DEFAULT_SETTINGS } };
}

function sanitizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    if (typeof raw.globalShortcuts === 'boolean') out.globalShortcuts = raw.globalShortcuts;
  }
  return out;
}

function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    cache = {
      ...emptyState(),
      accounts: sanitizeAccounts(raw.accounts),
      activeAccountId: typeof raw.activeAccountId === 'string' ? raw.activeAccountId : null,
      windowBounds: sanitizeBounds(raw.windowBounds),
      settings: sanitizeSettings(raw.settings),
    };
  } catch {
    cache = emptyState();
  }
  return cache;
}

function persist() {
  const target = filePath();
  const tmp = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, target);
}

function sanitizeAccounts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const { id, name, email, avatarColor, lastUsed, notes } = item;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (typeof name !== 'string' || typeof email !== 'string') continue;
    seen.add(id);
    out.push({
      id,
      name: name.slice(0, 200),
      email: email.slice(0, 320),
      avatarColor: AVATAR_COLOR_RE.test(avatarColor) ? avatarColor : 'bg-blue-500',
      lastUsed: Number.isFinite(lastUsed) ? lastUsed : 0,
      ...(typeof notes === 'string' ? { notes: notes.slice(0, 20000) } : {}),
    });
  }
  return out;
}

function sanitizeBounds(b) {
  if (!b || typeof b !== 'object') return null;
  const { x, y, width, height } = b;
  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width < 400 || height < 300) return null;
  return { x, y, width, height };
}

function getState() {
  const s = load();
  return { accounts: s.accounts, activeAccountId: s.activeAccountId };
}

function hasAccounts() {
  return load().accounts.length > 0;
}

function setState({ accounts, activeAccountId }) {
  const s = load();
  s.accounts = sanitizeAccounts(accounts);
  const validActive = typeof activeAccountId === 'string' && s.accounts.some((a) => a.id === activeAccountId);
  s.activeAccountId = validActive ? activeAccountId : null;
  persist();
  return getState();
}

function getWindowBounds() {
  return load().windowBounds;
}

function setWindowBounds(bounds) {
  const s = load();
  s.windowBounds = sanitizeBounds(bounds);
  persist();
}

function getSettings() {
  return { ...load().settings };
}

function setSettings(patch) {
  const s = load();
  s.settings = sanitizeSettings({ ...s.settings, ...(patch || {}) });
  persist();
  return getSettings();
}

module.exports = { getState, setState, hasAccounts, getWindowBounds, setWindowBounds, getSettings, setSettings };
