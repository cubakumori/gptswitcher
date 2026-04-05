import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface TitleBarProps {
  platform: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ platform }) => {
  const isMac = platform === 'darwin';

  return (
    <div className="h-10 bg-gray-100/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 backdrop-blur-md select-none sticky top-0 z-50 titlebar-drag-region">
      {/* macOS: spacer for native traffic lights */}
      {isMac && <div className="w-16 shrink-0" />}

      <div className="flex-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
        GPTSwitcher
      </div>

      {/* macOS: spacer for balance */}
      {isMac && <div className="w-16 shrink-0" />}

      {/* Windows/Linux: custom window controls */}
      {!isMac && (
        <div className="flex items-center shrink-0">
          <button
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="titlebar-no-drag w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Minus size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => window.electronAPI?.maximizeWindow()}
            className="titlebar-no-drag w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Square size={11} className="text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => window.electronAPI?.closeWindow()}
            className="titlebar-no-drag w-10 h-10 flex items-center justify-center hover:bg-red-500 group transition-colors"
          >
            <X size={14} className="text-gray-500 dark:text-gray-400 group-hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
};
