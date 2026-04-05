import React from 'react';

export const MacTitleBar: React.FC = () => {
  return (
    <div className="h-10 bg-gray-100/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 backdrop-blur-md select-none sticky top-0 z-50 titlebar-drag-region">
      {/* Spacer for native macOS traffic lights (hiddenInset) */}
      <div className="w-16 shrink-0" />
      <div className="flex-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
        GPTSwitcher
      </div>
      <div className="w-16 shrink-0" />
    </div>
  );
};
