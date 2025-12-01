import React from 'react';
import { Account } from '../types';
import { Plus, User, CheckCircle2, Trash2, LogOut } from 'lucide-react';

interface SidebarProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onDeleteAccount: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount
}) => {
  return (
    <div className="w-64 bg-gray-50/80 dark:bg-gray-900/80 border-r border-gray-200 dark:border-gray-800 flex flex-col backdrop-blur-xl h-full">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Your Accounts
        </h2>
        <div className="space-y-1">
          {accounts.map((account) => {
            const isActive = activeAccountId === account.id;
            return (
              <div
                key={account.id}
                onClick={() => onSelectAccount(account.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${account.avatarColor}`}>
                    {account.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">{account.name}</span>
                    <span className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      {account.email}
                    </span>
                  </div>
                </div>
                
                {isActive && (
                   <CheckCircle2 size={16} className="text-white shrink-0" />
                )}
                
                {!isActive && (
                    <button 
                        onClick={(e) => onDeleteAccount(account.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 hover:text-red-500 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
              </div>
            );
          })}

          {accounts.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No accounts added yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onAddAccount}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow text-sm font-medium text-gray-700 dark:text-gray-200 transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>
    </div>
  );
};