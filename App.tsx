import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { AccountDetail } from './components/AccountDetail';
import { AddAccountForm } from './components/AddAccountForm';
import { Account, OpenWorkspace, ViewState } from './types';
import { getStoredAccounts, saveAccounts } from './services/storageService';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>(ViewState.LIST);
  const [platform, setPlatform] = useState('darwin');
  const [openWorkspaces, setOpenWorkspaces] = useState<OpenWorkspace[]>([]);

  // Initialize from storage
  useEffect(() => {
    const stored = getStoredAccounts();
    setAccounts(stored);
    
    // Default to most recently used
    if (stored.length > 0) {
      const mostRecent = [...stored].sort((a, b) => b.lastUsed - a.lastUsed)[0];
      setActiveAccountId(mostRecent.id);
    }

    if (window.electronAPI?.getPlatform) {
      setPlatform(window.electronAPI.getPlatform());
    }
  }, []);

  // Track which workspace windows are open (main process is the source of truth)
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onOpenWorkspacesChanged) return;
    api.getOpenWorkspaces().then(setOpenWorkspaces).catch(() => {});
    return api.onOpenWorkspacesChanged(setOpenWorkspaces);
  }, []);

  // Persistence effect
  useEffect(() => {
    if (accounts.length > 0) {
        saveAccounts(accounts);
    }
  }, [accounts]);

  // Global Hotkeys Listener (Cmd+1...9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows) key
      if (e.metaKey || e.ctrlKey) {
        // Parse the key pressed
        const key = parseInt(e.key);
        
        // If it is a number between 1 and 9
        if (!isNaN(key) && key > 0 && key <= 9) {
          const index = key - 1;
          
          // Check if we have an account at this index
          if (index < accounts.length) {
            e.preventDefault(); // Prevent default browser behavior
            handleSwitchAccount(accounts[index].id);
          }
        }
        
        // Shortcut to Add Account (Cmd+N)
        if (e.key.toLowerCase() === 'n') {
             e.preventDefault();
             setViewState(ViewState.ADD);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accounts]); // Re-bind when accounts change so we have the latest list

  const handleSwitchAccount = (id: string) => {
    setActiveAccountId(id);
    setViewState(ViewState.LIST);
    
    // Optimistic update for UI, real update happens on Launch
    setAccounts(prev => prev.map(acc => ({
        ...acc,
        isActive: acc.id === id
    })));
  };

  const handleAddAccount = (newAccountData: Omit<Account, 'id' | 'lastUsed' | 'isActive'>) => {
    const newAccount: Account = {
      ...newAccountData,
      id: crypto.randomUUID(),
      lastUsed: Date.now(), // Newly added is "last used" by default as we switch to it
      isActive: true,
    };

    const updatedAccounts = [...accounts, newAccount].map(acc => ({
        ...acc,
        isActive: acc.id === newAccount.id // Deactivate others
    }));

    setAccounts(updatedAccounts);
    setActiveAccountId(newAccount.id);
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
        "Remove this account? Its open workspaces will be closed and its saved login, cookies and cache will be deleted from this computer."
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
      saveAccounts(updated); // Force save immediately for deletion

      if (activeAccountId === id) {
          if (updated.length > 0) {
              setActiveAccountId(updated[0].id);
          } else {
              setActiveAccountId(null);
          }
      }
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId);
  const openAccountIds = new Set(openWorkspaces.map(w => w.partitionId));

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
      
      <TitleBar platform={platform} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          accounts={accounts}
          activeAccountId={activeAccountId}
          openAccountIds={openAccountIds}
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

        {viewState === ViewState.LIST && activeAccount && (
          <AccountDetail 
              account={activeAccount} 
              platform={platform}
              openTargets={openWorkspaces.filter(w => w.partitionId === activeAccount.id).map(w => w.target)}
              onUpdate={handleUpdateAccount}
          />
        )}

        {viewState === ViewState.LIST && !activeAccount && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 mb-4 animate-pulse"></div>
              <p>Select an account to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
