// Smoke test del proceso principal. Se ejecuta con `npm test` (electron test/smoke.js).
// Arranca main.js con un userData temporal y ejercita los handlers IPC reales sin tocar
// los datos del usuario. No necesita el renderer ni el dev server.
const { app, ipcMain, BrowserWindow, globalShortcut } = require('electron');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gptswitcher-smoke-'));
app.setPath('userData', path.join(tmpRoot, 'userData'));

const main = require(path.join(__dirname, '..', 'main.js'));

const invoke = (channel, ...args) => {
  const handler = ipcMain._invokeHandlers.get(channel);
  assert(handler, `no ipcMain.handle for ${channel}`);
  return handler({ sender: null }, ...args);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readStore = () => JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'accounts.json'), 'utf8'));

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`  ok   ${name}`);
  } catch (err) {
    results.push(`  FAIL ${name}\n       ${err.message}`);
    process.exitCode = 1;
  }
}

app.whenReady().then(async () => {
  await sleep(1200);

  await step('shouldOpenInApp allowlist', () => {
    assert.strictEqual(main.shouldOpenInApp('https://chatgpt.com/codex'), true);
    assert.strictEqual(main.shouldOpenInApp('https://auth.openai.com/authorize'), true);
    assert.strictEqual(main.shouldOpenInApp('https://accounts.google.com/o/oauth2'), true);
    assert.strictEqual(main.shouldOpenInApp('https://github.com/login/oauth/authorize'), true);
    assert.strictEqual(main.shouldOpenInApp('https://github.com/openai/codex'), false, 'repo links go to the browser');
    assert.strictEqual(main.shouldOpenInApp('http://chatgpt.com'), false, 'plain http is never in-app');
    assert.strictEqual(main.shouldOpenInApp('https://evil-chatgpt.com'), false);
    assert.strictEqual(main.shouldOpenInApp('not a url'), false);
  });

  await step('codexShellCommand escapes the path', () => {
    const cmd = main.codexShellCommand('/Users/x/App Support/a"b$c');
    if (process.platform === 'win32') assert(cmd.startsWith('$env:CODEX_HOME'));
    else assert.strictEqual(cmd, 'export CODEX_HOME="/Users/x/App Support/a\\"b\\$c" && codex');
  });

  await step('store starts empty', async () => {
    assert.deepStrictEqual(await invoke('store:get'), { accounts: [], activeAccountId: null });
  });

  await step('store:set sanitises and persists', async () => {
    const dirty = { id: 'acc-1', name: 'Smoke', email: 's@example.com', avatarColor: 'bg-teal-500', lastUsed: 5, notes: 'n', isActive: true, junk: 1 };
    const state = await invoke('store:set', { accounts: [dirty, { id: 'acc-1', name: 'dup', email: 'x' }, { name: 'no id' }], activeAccountId: 'acc-1' });
    assert.deepStrictEqual(state.accounts, [{ id: 'acc-1', name: 'Smoke', email: 's@example.com', avatarColor: 'bg-teal-500', lastUsed: 5, notes: 'n' }]);
    assert.strictEqual(state.activeAccountId, 'acc-1');
    assert.deepStrictEqual(readStore().accounts, state.accounts);
  });

  await step('invalid activeAccountId is dropped', async () => {
    const state = await invoke('store:set', { accounts: (await invoke('store:get')).accounts, activeAccountId: 'ghost' });
    assert.strictEqual(state.activeAccountId, null);
    await invoke('store:set', { accounts: state.accounts, activeAccountId: 'acc-1' });
  });

  await step('settings default and toggle', async () => {
    assert.deepStrictEqual(await invoke('settings:get'), { globalShortcuts: true });
    assert.strictEqual(globalShortcut.isRegistered('CommandOrControl+Alt+1'), true);
    assert.deepStrictEqual(await invoke('settings:set', { globalShortcuts: false, junk: 1 }), { globalShortcuts: false });
    assert.strictEqual(globalShortcut.isRegistered('CommandOrControl+Alt+1'), false);
    await invoke('settings:set', { globalShortcuts: true });
    assert.strictEqual(globalShortcut.isRegistered('CommandOrControl+Alt+1'), true);
  });

  let home;
  await step('codex:get-home creates CODEX_HOME with file credential store', async () => {
    const info = await invoke('codex:get-home', 'acc-1');
    home = info.home;
    assert(home.endsWith(path.join('codex', 'acc-1')));
    assert(info.command.includes(home));
    const toml = fs.readFileSync(path.join(home, 'config.toml'), 'utf8');
    assert(toml.includes('cli_auth_credentials_store = "file"'));
    assert.strictEqual(await invoke('codex:get-home', '../etc'), null, 'path-like ids are rejected');
  });

  await step('workspace windows open, dedupe and report', async () => {
    assert.deepStrictEqual(await invoke('get-open-workspaces'), []);
    ipcMain.emit('open-isolated-browser', {}, { partitionId: 'acc-1', target: 'codex', title: 'Smoke' });
    ipcMain.emit('open-isolated-browser', {}, { partitionId: 'acc-1', target: 'codex', title: 'Smoke' });
    ipcMain.emit('open-isolated-browser', {}, { partitionId: 'acc-1', target: 'bogus', title: 'Smoke' });
    await sleep(400);
    const open = await invoke('get-open-workspaces');
    assert.deepStrictEqual(open.sort((a, b) => a.target.localeCompare(b.target)), [
      { partitionId: 'acc-1', target: 'chatgpt' }, // 'bogus' falls back to chatgpt
      { partitionId: 'acc-1', target: 'codex' },
    ]);
    const titles = BrowserWindow.getAllWindows().map((w) => w.getTitle());
    assert(titles.includes('Smoke · Codex'), `titles: ${titles}`);
  });

  await step('clear-account-session closes windows and wipes CODEX_HOME', async () => {
    assert.strictEqual(await invoke('clear-account-session', 'acc-1'), true);
    await sleep(300);
    assert.deepStrictEqual(await invoke('get-open-workspaces'), []);
    assert.strictEqual(fs.existsSync(home), false);
  });

  await step('main window bounds are saved and restorable', async () => {
    const win = BrowserWindow.getAllWindows().find((w) => w.getTitle() === 'GPTSwitcher') || BrowserWindow.getAllWindows()[0];
    win.setBounds({ x: 120, y: 90, width: 960, height: 640 });
    await sleep(700);
    assert.deepStrictEqual(readStore().windowBounds, { x: 120, y: 90, width: 960, height: 640 });
  });

  console.log(`\nGPT Switcher smoke test (${results.filter((r) => r.startsWith('  ok')).length}/${results.length} passed)\n${results.join('\n')}\n`);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  app.exit(process.exitCode || 0);
}).catch((err) => {
  console.error('smoke test crashed', err);
  app.exit(1);
});
