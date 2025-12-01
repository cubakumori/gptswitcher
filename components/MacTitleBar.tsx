import React from 'react';

export const MacTitleBar: React.FC = () => {
  return (
    <div className="h-10 bg-gray-100/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 backdrop-blur-md select-none sticky top-0 z-50 titlebar-drag-region">
      {/* Traffic Lights - marked as no-drag so they are clickable */}
      <div className="flex space-x-2 group titlebar-no-drag">
        <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600 shadow-sm group-hover:bg-red-600 flex items-center justify-center text-[8px] text-red-900 font-bold opacity-80 cursor-default">
          <span className="opacity-0 group-hover:opacity-100">×</span>
        </div>
        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500 shadow-sm group-hover:bg-yellow-500 flex items-center justify-center text-[8px] text-yellow-900 font-bold opacity-80 cursor-default">
          <span className="opacity-0 group-hover:opacity-100">−</span>
        </div>
        <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600 shadow-sm group-hover:bg-green-600 flex items-center justify-center text-[8px] text-green-900 font-bold opacity-80 cursor-default">
          <span className="opacity-0 group-hover:opacity-100">+</span>
        </div>
      </div>
      <div className="flex-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
        GPTSwitcher
      </div>
      <div className="w-10"></div> {/* Spacer for balance */}
    </div>
  );
};