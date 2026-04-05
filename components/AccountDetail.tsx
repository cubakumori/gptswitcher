import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { ExternalLink, ShieldCheck, Clock, Activity, Loader2, Command } from 'lucide-react';

interface AccountDetailProps {
  account: Account;
  onUpdate: (id: string, updates: Partial<Account>) => void;
}

// Map the avatar color (bg-X-500) to specific button styles (bg-X-600, hover, shadow)
const getColorStyles = (colorClass: string) => {
  const mapping: Record<string, string> = {
    'bg-blue-500': 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30',
    'bg-green-500': 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30',
    'bg-purple-500': 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/30',
    'bg-yellow-500': 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-yellow-500/30',
    'bg-pink-500': 'bg-pink-600 hover:bg-pink-700 hover:shadow-pink-500/30',
    'bg-indigo-500': 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30',
    'bg-red-500': 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30',
    'bg-teal-500': 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/30',
  };
  
  // Fallback to blue if color not found
  return mapping[colorClass] || mapping['bg-blue-500'];
};

export const AccountDetail: React.FC<AccountDetailProps> = ({ account, onUpdate }) => {
  const [isLaunchingWeb, setIsLaunchingWeb] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [notes, setNotes] = useState(account.notes || '');

  // Electron IPC helper
  const sendIpc = (channel: string, data?: any) => {
    if (window.electronAPI) {
      window.electronAPI.openIsolatedBrowser(data);
    } else {
      // Fallback for web preview
      if (channel === 'open-isolated-browser') window.open(data.url, '_blank');
    }
  };

  useEffect(() => {
    setNotes(account.notes || '');
    setIsEdited(false);
  }, [account.id]);

  const handleLaunchWeb = () => {
    setIsLaunchingWeb(true);
    onUpdate(account.id, { lastUsed: Date.now() });
    
    // Call the isolated browser handler
    sendIpc('open-isolated-browser', { 
      url: 'https://chatgpt.com', 
      partitionId: account.id, // This ID creates the unique cookie jar
      title: account.name // Pass the account name as the window title
    });

    setTimeout(() => setIsLaunchingWeb(false), 1000);
  };

  const handleSaveNotes = () => {
      onUpdate(account.id, { notes });
      setIsEdited(false);
  }

  const lastUsedDate = new Date(account.lastUsed);
  const buttonStyle = getColorStyles(account.avatarColor);
  
  return (
    <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between gap-8">
          
          {/* Left Column: Identity (Approx 2/3) */}
          <div className="flex items-center space-x-6 flex-1 overflow-hidden">
            <div className={`w-20 h-20 shrink-0 rounded-2xl ${account.avatarColor} shadow-lg flex items-center justify-center text-3xl font-bold text-white`}>
              {account.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                {account.name}
              </h1>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm truncate">
                <ShieldCheck size={14} className="text-green-500 shrink-0" />
                <span className="truncate">{account.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-xs mt-2">
                <Clock size={12} className="shrink-0" />
                <span>Last active: {account.lastUsed > 0 ? lastUsedDate.toLocaleString() : 'Never'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Action (Approx 1/3) */}
          <div className="w-1/3 min-w-[260px] shrink-0 flex flex-col items-center">
            <button
                onClick={handleLaunchWeb}
                disabled={isLaunchingWeb}
                className={`
                w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-bold shadow-lg transition-all duration-200 text-lg text-white active:scale-[0.99]
                ${isLaunchingWeb 
                    ? 'bg-gray-100 !text-gray-400 cursor-not-allowed dark:bg-gray-800 shadow-none' 
                    : buttonStyle
                }
                `}
            >
                {isLaunchingWeb ? (
                <Loader2 size={24} className="animate-spin" />
                ) : (
                <ExternalLink size={24} />
                )}
                <span>Launch Workspace</span>
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center space-x-1 opacity-80">
                <Command size={10} />
                <span>Menu: Window &gt; {account.name}</span>
            </p>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Status Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start space-x-4">
                <Activity className="text-blue-600 dark:text-blue-400 mt-1 shrink-0" size={20} />
                <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">Isolated Environment</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        This workspace runs in a <strong>persistent partition</strong>. 
                        Cookies and login sessions are completely isolated from your other accounts. 
                        Closing the window saves the session for next time.
                    </p>
                </div>
            </div>

            {/* Notes Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Session Notes & Instructions
                    </label>
                    {isEdited && (
                        <button onClick={handleSaveNotes} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                            Save Changes
                        </button>
                    )}
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => {
                        setNotes(e.target.value);
                        setIsEdited(true);
                    }}
                    placeholder="E.g., Use GPT-4 for code generation only on this account..."
                    className="w-full h-40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-shadow text-sm leading-relaxed"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                     <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Session Partition ID</div>
                     <div className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate">{account.id}</div>
                </div>
                 <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                     <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Isolation Type</div>
                     <div className="text-sm text-gray-800 dark:text-gray-200 flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Persistent Partition</span>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};