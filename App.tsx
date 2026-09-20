import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { AccountDetail } from './components/AccountDetail';
import { AddAccountForm } from './components/AddAccountForm';
import { Account, OpenWorkspace, ViewState } from './types';
import { loadState, persistState } from './services/storageService';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [viewState, setViewState] = useState<ViewState>(ViewState.LIST);
  const [platform, setPlatform] = useState('darwin');
  const [openWorkspaces, setOpenWorkspaces] = useState<OpenWorkspace[]>([]);

  // Initialize from the main-process store (migrates legacy localStorage on first run)
  useEffect(() => {
    let cancelled = false;
    loadState().then((state) => {
      if (cancelled) return;
      setAccounts(state.accounts);
      setActiveAccountId(state.activeAccountId ?? state.accounts[0]?.id ?? null);
      setLoaded(true);
    });

    if (window.electronAPI?.getPlatform) {
      setPlatform(window.electronAPI.getPlatform());
    }
    return () => { cancelled = true; };
  }, []);

  // Track which workspace windows are open (main process is the source of truth)
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onOpenWorkspacesChanged) return;
    api.getOpenWorkspaces().then(setOpenWorkspaces).catch(() => {});
    return api.onOpenWorkspacesChanged(setOpenWorkspaces);
  }, []);

  // Persist accounts and the selected account once the initial load has finished
  useEffect(() => {
    if (!loaded) return;
    persistState({ accounts, activeAccountId });
  }, [loaded, accounts, activeAccountId]);

  // Global Hotkeys Listener (Cmd+1...9, Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      const key = parseInt(e.key);
      if (!isNaN(key) && key > 0 && key <= 9) {
        const index = key - 1;
        if (index < accounts.length) {
          e.preventDefault();
          handleSwitchAccount(accounts[index].id);
        }
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setViewState(ViewState.ADD);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accounts]);

  const handleSwitchAccount = (id: string) => {
    setActiveAccountId(id);
    setViewState(ViewState.LIST);
  };

  const handleAddAccount = (newAccountData: Omit<Account, 'id' | 'lastUsed'>) => {
    const newAccount: Account = {
      ...newAccountData,
      id: crypto.randomUUID(),
      lastUsed: Date.now(),
    };
    setAccounts(prev => [...prev, newAccount]);
    setActiveAccountId(newAccount.id);
    setViewState(ViewState.LIST);
  };

  const handleEditAccount = (id: string, data: Omit<Account, 'id' | 'lastUsed'>) => {
    handleUpdateAccount(id, data);
    setViewState(ViewState.LIST);
  };

  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
  };

  const handleDeleteAccount = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const confirm = window.confirm(
        "Remove this account? Its open workspaces will be closed and its saved login, cookies, cache and Codex CLI credentials will be deleted from this computer."
      );
      if (!confirm) return;

      // Wipe the isolated partition first so no session data is left behind on disk
      try {
        await window.electronAPI?.clearAccountSession(id);
      } catch (err) {
        console.error('Failed to clear account session', err);
      }

      const updated = accounts.filter(a => a.id !== id);
      setAccounts(updated);
      if (activeAccountId === id) {
          setActiveAccountId(updated[0]?.id ?? null);
      }
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId);
  if (viewState === ViewState.EDIT && !activeAccount) setViewState(ViewState.LIST);
  const openAccountIds = new Set(openWorkspaces.map(w => w.partitionId));

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
      
      <TitleBar platform={platform} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          accounts={accounts}
          activeAccountId={activeAccountId}
          openAccountIds={openAccountIds}
          platform={platform}
          onSelectAccount={handleSwitchAccount}
          onAddAccount={() => setViewState(ViewState.ADD)}
          onDeleteAccount={handleDeleteAccount}
        />

        {viewState === ViewState.ADD && (
          <AddAccountForm 
              onCancel={() => {
                  setViewState(ViewState.LIST);
                  if (!activeAccountId && accounts.length > 0) {
                      setActiveAccountId(accounts[0].id);
                  }
              }}
              onSave={handleAddAccount}
          />
        )}

        {viewState === ViewState.EDIT && activeAccount && (
          <AddAccountForm
              key={activeAccount.id}
              initial={activeAccount}
              onCancel={() => setViewState(ViewState.LIST)}
              onSave={(data) => handleEditAccount(activeAccount.id, data)}
          />
        )}

        {viewState === ViewState.LIST && activeAccount && (
          <AccountDetail 
              account={activeAccount} 
              platform={platform}
              openTargets={openWorkspaces.filter(w => w.partitionId === activeAccount.id).map(w => w.target)}
              onUpdate={handleUpdateAccount}
              onEdit={() => setViewState(ViewState.EDIT)}
          />
        )}

        {viewState === ViewState.LIST && !activeAccount && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 mb-4 animate-pulse"></div>
              <p>{loaded ? 'Select an account to begin' : 'Loading accounts…'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
