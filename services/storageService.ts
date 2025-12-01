import { Account } from '../types';

const STORAGE_KEY = 'gpt_switcher_accounts';

export const getStoredAccounts = (): Account[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load accounts", e);
    return [];
  }
};

export const saveAccounts = (accounts: Account[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts", e);
  }
};