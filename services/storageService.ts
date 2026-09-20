import { Account, PersistedState } from '../types';

// Clave usada hasta la 0.4.0, cuando las cuentas vivian en el localStorage del renderer.
const LEGACY_STORAGE_KEY = 'gpt_switcher_accounts';

const stripLegacyFields = (accounts: Account[]): Account[] =>
  accounts.map(({ id, name, email, avatarColor, lastUsed, notes }) => ({
    id, name, email, avatarColor, lastUsed, ...(notes !== undefined ? { notes } : {}),
  }));

const readLegacy = (): Account[] => {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? stripLegacyFields(JSON.parse(stored)) : [];
  } catch (e) {
    console.error('Failed to read legacy accounts', e);
    return [];
  }
};

const mostRecentId = (accounts: Account[]): string | null =>
  accounts.length ? [...accounts].sort((a, b) => b.lastUsed - a.lastUsed)[0].id : null;

/** Carga el estado desde el proceso principal; migra el localStorage antiguo la primera vez. */
export const loadState = async (): Promise<PersistedState> => {
  const api = window.electronAPI;
  if (api?.getState) {
    const state = await api.getState();
    if (state.accounts.length === 0) {
      const legacy = readLegacy();
      if (legacy.length > 0) {
        const migrated = await api.saveState({ accounts: legacy, activeAccountId: mostRecentId(legacy) });
        try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
        return migrated;
      }
    }
    return state;
  }
  // Fallback para la vista previa web (sin Electron)
  const accounts = readLegacy();
  return { accounts, activeAccountId: mostRecentId(accounts) };
};

export const persistState = async (state: PersistedState): Promise<void> => {
  const api = window.electronAPI;
  if (api?.saveState) {
    await api.saveState(state);
    return;
  }
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state.accounts));
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
};
