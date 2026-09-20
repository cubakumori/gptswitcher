import React, { useState, useEffect } from 'react';
import { Account, CodexHomeInfo, WorkspaceTarget } from '../types';
import { ExternalLink, ShieldCheck, Clock, Activity, Loader2, Command, Terminal, MessageSquare, SquareTerminal, Copy, Check } from 'lucide-react';

interface AccountDetailProps {
  account: Account;
  platform: string;
  openTargets: WorkspaceTarget[];
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

const TARGET_URLS: Record<WorkspaceTarget, string> = {
  chatgpt: 'https://chatgpt.com',
  codex: 'https://chatgpt.com/codex',
};

export const AccountDetail: React.FC<AccountDetailProps> = ({ account, platform, openTargets, onUpdate }) => {
  const [launching, setLaunching] = useState<WorkspaceTarget | null>(null);
  const [isEdited, setIsEdited] = useState(false);
  const [notes, setNotes] = useState(account.notes || '');
  const [codexHome, setCodexHome] = useState<CodexHomeInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const isMac = platform === 'darwin';
  const hasCodexCli = Boolean(window.electronAPI?.getCodexHome);

  useEffect(() => {
    setNotes(account.notes || '');
    setIsEdited(false);
    setCopied(false);
    setCodexHome(null);
    if (!window.electronAPI?.getCodexHome) return;
    let cancelled = false;
    window.electronAPI.getCodexHome(account.id).then((info) => {
      if (!cancelled) setCodexHome(info);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [account.id]);

  const handleOpenTerminal = () => {
    window.electronAPI?.openCodexTerminal(account.id).catch(() => {});
  };

  const handleCopyCommand = async () => {
    const api = window.electronAPI;
    if (!api) return;
    const ok = await api.copyCodexCommand(account.id).catch(() => false);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleLaunch = (target: WorkspaceTarget) => {
    setLaunching(target);
    onUpdate(account.id, { lastUsed: Date.now() });

    if (window.electronAPI) {
      window.electronAPI.openIsolatedBrowser({
        partitionId: account.id, // This ID selects the account's isolated cookie jar
        target,
        title: account.name,
      });
    } else {
      // Fallback for web preview outside Electron
      window.open(TARGET_URLS[target], '_blank');
    }

    setTimeout(() => setLaunching(null), 800);
  };

  const handleSaveNotes = () => {
      onUpdate(account.id, { notes });
      setIsEdited(false);
  }

  const lastUsedDate = new Date(account.lastUsed);
  const buttonStyle = getColorStyles(account.avatarColor);
  const chatOpen = openTargets.includes('chatgpt');
  const codexOpen = openTargets.includes('codex');
  
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

          {/* Right Column: Actions (Approx 1/3) */}
          <div className="w-1/3 min-w-[260px] shrink-0 flex flex-col items-stretch space-y-2">
            <button
                onClick={() => handleLaunch('chatgpt')}
                disabled={launching !== null}
                className={`
                w-full flex items-center justify-center space-x-3 px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 text-base text-white active:scale-[0.99]
                ${launching === 'chatgpt'
                    ? 'bg-gray-100 text-gray-400! cursor-not-allowed dark:bg-gray-800 shadow-none' 
                    : buttonStyle
                }
                `}
            >
                {launching === 'chatgpt' ? (
                <Loader2 size={20} className="animate-spin" />
                ) : (
                <MessageSquare size={20} />
                )}
                <span>{chatOpen ? 'Focus ChatGPT' : 'Launch ChatGPT'}</span>
            </button>

            <button
                onClick={() => handleLaunch('codex')}
                disabled={launching !== null}
                className={`
                w-full flex items-center justify-center space-x-3 px-6 py-3 rounded-xl font-semibold border transition-all duration-200 text-base active:scale-[0.99]
                ${launching === 'codex'
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'
                    : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
                }
                `}
            >
                {launching === 'codex' ? (
                <Loader2 size={20} className="animate-spin" />
                ) : (
                <Terminal size={20} />
                )}
                <span>{codexOpen ? 'Focus Codex' : 'Launch Codex'}</span>
            </button>

            <p className="text-center text-[10px] text-gray-400 flex items-center justify-center space-x-1 opacity-80">
                {isMac ? (
                  <>
                    <Command size={10} />
                    <span>Menu: Window &gt; {account.name}</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={10} />
                    <span>Both open in the same isolated session</span>
                  </>
                )}
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
                        ChatGPT and Codex for this account run in one <strong>persistent partition</strong>. 
                        Cookies and login sessions are completely isolated from your other accounts. 
                        Closing a window saves the session for next time.
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
                    placeholder="E.g., Work account: Codex is connected to the company GitHub org, keep personal repos out..."
                    className="w-full h-40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-shadow text-sm leading-relaxed"
                />
            </div>
            

            {/* Codex CLI / IDE */}
            {hasCodexCli && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <SquareTerminal size={16} className="text-gray-500 shrink-0" />
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">Codex CLI &amp; IDE</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This account has its own <code className="font-mono">CODEX_HOME</code>, so the Codex CLI and the IDE extension
                      can stay signed in here without touching your other accounts. Run <code className="font-mono">codex</code> once in
                      that terminal and choose "Sign in with ChatGPT".
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleCopyCommand}
                      disabled={!codexHome}
                      title="Copy the shell command that sets CODEX_HOME and starts codex"
                      className="flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy command'}</span>
                    </button>
                    <button
                      onClick={handleOpenTerminal}
                      disabled={!codexHome}
                      className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white disabled:opacity-50 transition-colors"
                    >
                      <Terminal size={14} />
                      <span>Open Terminal</span>
                    </button>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 truncate select-text">
                  {codexHome ? codexHome.command : 'Preparing…'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                     <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Session Partition ID</div>
                     <div className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate">{account.id}</div>
                </div>
                 <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                     <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Open Workspaces</div>
                     <div className="text-sm text-gray-800 dark:text-gray-200 flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${chatOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          <span>ChatGPT</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${codexOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          <span>Codex</span>
                        </span>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
