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
      openIsolatedBrowser: (data: { url: string; partitionId: string; title: string }) => void;
      getPlatform: () => string;
    };
  }
}