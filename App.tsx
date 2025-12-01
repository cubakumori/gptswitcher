import React, { useState, useEffect } from 'react';
import { MacTitleBar } from './components/MacTitleBar';
import { Sidebar } from './components/Sidebar';
import { AccountDetail } from './components/AccountDetail';
import { AddAccountForm } from './components/AddAccountForm';
import { Account, ViewState } from './types';
import { getStoredAccounts, saveAccounts } from './services/storageService';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>(ViewState.LIST);

  // Initialize from storage
  useEffect(() => {
    const stored = getStoredAccounts();
    setAccounts(stored);
    
    // Default to most recently used
    if (stored.length > 0) {
      const mostRecent = [...stored].sort((a, b) => b.lastUsed - a.lastUsed)[0];
      setActiveAccountId(mostRecent.id);
    }
  }, []);

  // Persistence effect
  useEffect(() => {
    if (accounts.length > 0) {
        saveAccounts(accounts);
    }
  }, [accounts]);

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

  const handleDeleteAccount = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const confirm = window.confirm("Are you sure you want to remove this account?");
      if (!confirm) return;

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

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
      
      <MacTitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          accounts={accounts}
          activeAccountId={activeAccountId}
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