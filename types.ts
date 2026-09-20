export interface Account {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  lastUsed: number;
  isActive: boolean;
  notes?: string;
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
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getPlatform: () => string;
    };
  }
}
