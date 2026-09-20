import React, { useState } from 'react';
import { Account, AVATAR_COLORS } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

interface AddAccountFormProps {
  /** Cuenta existente: el formulario pasa a modo edicion. */
  initial?: Account;
  onCancel: () => void;
  onSave: (account: Omit<Account, 'id' | 'lastUsed'>) => void;
}

export const AddAccountForm: React.FC<AddAccountFormProps> = ({ initial, onCancel, onSave }) => {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [selectedColor, setSelectedColor] = useState(initial?.avatarColor ?? AVATAR_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      onSave({
        name: name.trim(),
        email: email.trim(),
        avatarColor: selectedColor,
        ...(initial?.notes !== undefined ? { notes: initial.notes } : {}),
      });
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col p-8">
      <div className="max-w-md mx-auto w-full">
        <button 
            onClick={onCancel}
            className="flex items-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
        >
            <ArrowLeft size={16} className="mr-2" />
            {isEdit ? 'Back to Account' : 'Back to Accounts'}
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{isEdit ? 'Edit Account' : 'Connect New Account'}</h2>

        {isEdit && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-6">
            Name, email and color are labels inside GPT Switcher only. The saved ChatGPT and Codex sessions for this account are kept.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profile Name
                </label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Work Workspace"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                </label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="yourname@company.com"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Color
                </label>
                <div className="flex flex-wrap gap-3">
                    {AVATAR_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full ${color} transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                        />
                    ))}
                </div>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
                >
                    <Save size={18} />
                    <span>{isEdit ? 'Save Changes' : 'Save Account'}</span>
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};