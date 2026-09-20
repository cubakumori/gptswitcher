export interface Account {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  lastUsed: number;
  notes?: string;
}

export interface PersistedState {
  accounts: Account[];
  activeAccountId: string | null;
}

export enum ViewState {
  LIST = 'LIST',
  ADD = 'ADD',
  EDIT = 'EDIT'
}

export type WorkspaceTarget = 'chatgpt' | 'codex';

export interface OpenWorkspace {
  partitionId: string;
  target: WorkspaceTarget;
}

export interface CodexHomeInfo {
  home: string;
  command: string;
}

export const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
];

declare global {
  interface Window {
    electronAPI?: {
      openIsolatedBrowser: (data: { partitionId: string; target: WorkspaceTarget; title: string }) => void;
      clearAccountSession: (partitionId: string) => Promise<boolean>;
      getOpenWorkspaces: () => Promise<OpenWorkspace[]>;
      onOpenWorkspacesChanged: (callback: (list: OpenWorkspace[]) => void) => () => void;
      getState: () => Promise<PersistedState>;
      saveState: (state: PersistedState) => Promise<PersistedState>;
      getCodexHome: (accountId: string) => Promise<CodexHomeInfo | null>;
      openCodexTerminal: (accountId: string) => Promise<boolean>;
      copyCodexCommand: (accountId: string) => Promise<boolean>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getPlatform: () => string;
    };
  }
}
