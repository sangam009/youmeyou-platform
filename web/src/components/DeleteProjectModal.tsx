import React from 'react';

export default function DeleteProjectModal({ open, onClose, onDelete, projectName }: { open: boolean; onClose: () => void; onDelete: () => void; projectName: string }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Delete Project</h2>
        <p className="text-gray-600 mb-6 text-center">Are you sure you want to delete <span className="font-semibold text-gray-900">{projectName}</span>? This action cannot be undone.</p>
        <div className="flex justify-end gap-3 w-full">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition">Cancel</button>
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 text-white font-bold shadow-md hover:brightness-110 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 