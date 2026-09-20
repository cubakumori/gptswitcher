// Preload de las ventanas de workspace (ChatGPT / Codex y sus popups de login).
// No expone ninguna API a la pagina. Su unico trabajo es que los Client Hints que ve el
// JavaScript de la pagina (navigator.userAgentData) coincidan con el User-Agent de Chrome
// que ya enviamos: Electron anuncia solo "Chromium", y Google trata esa combinacion como
// navegador embebido ("Es posible que el navegador o la aplicacion no sean seguros").
const { contextBridge } = require('electron');

const chromeVersion = process.versions.chrome;
const major = chromeVersion.split('.')[0];

const brands = [
  { brand: 'Chromium', version: major },
  { brand: 'Google Chrome', version: major },
  { brand: 'Not?A_Brand', version: '24' },
];
const fullVersionList = [
  { brand: 'Chromium', version: chromeVersion },
  { brand: 'Google Chrome', version: chromeVersion },
  { brand: 'Not?A_Brand', version: '24.0.0.0' },
];

function patchUserAgentData(brands, fullVersionList) {
  const original = navigator.userAgentData;
  if (!original) return false;
  const patched = {
    get brands() { return brands.map((b) => ({ ...b })); },
    get mobile() { return original.mobile; },
    get platform() { return original.platform; },
    async getHighEntropyValues(hints) {
      const values = await original.getHighEntropyValues(hints);
      values.brands = brands.map((b) => ({ ...b }));
      if ('fullVersionList' in values) values.fullVersionList = fullVersionList.map((b) => ({ ...b }));
      return values;
    },
    toJSON() {
      return { brands: brands.map((b) => ({ ...b })), mobile: original.mobile, platform: original.platform };
    },
  };
  if (typeof NavigatorUAData !== 'undefined') Object.setPrototypeOf(patched, NavigatorUAData.prototype);
  Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => patched, configurable: true, enumerable: true });
  return true;
}

// En accounts.google.com la app se presenta como Firefox (ver main.js); ahi no se toca nada.
const FIREFOX_IDENTITY_HOSTS = ['accounts.google.com'];
const host = window.location.hostname;
const firefoxIdentity = FIREFOX_IDENTITY_HOSTS.some((h) => host === h || host.endsWith('.' + h));

try {
  if (!firefoxIdentity) contextBridge.executeInMainWorld({ func: patchUserAgentData, args: [brands, fullVersionList] });
} catch (err) {
  console.error('GPT Switcher: could not patch navigator.userAgentData', err);
}
