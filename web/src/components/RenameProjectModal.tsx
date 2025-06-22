import React, { useState, useEffect } from 'react';

export default function RenameProjectModal({ open, onClose, onRename, currentName }: { open: boolean; onClose: () => void; onRename: (newName: string) => void; currentName: string }) {
  const [name, setName] = useState(currentName);
  useEffect(() => { setName(currentName); }, [currentName, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Rename Project</h2>
        <input
          type="text"
          className="mb-6 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter new project name"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition">Cancel</button>
          <button
            onClick={() => { onRename(name); }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 text-white font-bold shadow-md hover:brightness-110 transition disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 