'use client';

import React, { useState, useEffect } from 'react';
import CodalooLogo from '@/components/CodalooLogo';
import Link from 'next/link';
import { getWorkspaces, createWorkspace } from '@/lib/dashboardApi';

function WorkspaceContextProvider({ children, value }: { children: React.ReactNode, value: any }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const WorkspaceContext = React.createContext<any>(null);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<{ id: string, name: string }[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<{ id: string, name: string } | null>(null);
  const [wsDropdown, setWsDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [wsError, setWsError] = useState('');

  useEffect(() => {
    getWorkspaces().then(data => {
      setWorkspaces(data);
      if (data.length > 0) setActiveWorkspace(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreateWorkspace = async () => {
    if (workspaces.length >= 3) {
      setWsError('Workspace limit reached (3)');
      return;
    }
    if (!newWsName.trim()) {
      setWsError('Workspace name required');
      return;
    }
    setWsError('');
    try {
      const ws = await createWorkspace(newWsName.trim());
      setWorkspaces(prev => [...prev, ws]);
      setActiveWorkspace(ws);
      setShowNewWs(false);
      setNewWsName('');
    } catch (e) {
      setWsError('Failed to create workspace');
    }
  };

  return (
    <WorkspaceContextProvider value={{ activeWorkspace, setActiveWorkspace }}>
      <div className="min-h-screen flex bg-white">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6">
          <div className="flex items-center gap-3 mb-8">
            <CodalooLogo size={36} />
            <span className="text-xl font-bold text-gray-900 tracking-tight">Codaloo</span>
          </div>
          {/* User info (mock) */}
          <Link href="/dashboard/profile" className="flex items-center gap-3 mb-6 hover:bg-gray-50 rounded p-2 transition">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-300 via-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">S</div>
            <div>
              <div className="font-semibold text-gray-800">Sangam Dubey</div>
              <div className="text-xs text-gray-400">@sangam</div>
            </div>
          </Link>
          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            <a href="#" className="text-blue-600 font-medium bg-blue-50 rounded px-3 py-2">Recents</a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 rounded px-3 py-2">Drafts</a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 rounded px-3 py-2">Templates & Tools</a>
            <div className="mt-6 mb-2 text-xs text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Workspaces</span>
              <button onClick={() => setShowNewWs(true)} className="ml-2 text-blue-500 text-lg font-bold hover:text-blue-700">+</button>
            </div>
            {loading ? (
              <div className="text-gray-400 text-sm px-3 py-2">Loading...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-gray-400 text-sm px-3 py-2">No workspaces</div>
            ) : workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setActiveWorkspace(ws)}
                className={`text-left w-full px-3 py-2 rounded transition font-medium ${activeWorkspace?.id === ws.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {ws.name}
              </button>
            ))}
            <a href="#" className="text-gray-700 hover:bg-gray-50 rounded px-3 py-2">All projects</a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 rounded px-3 py-2">Trash</a>
          </nav>
          {/* New Workspace Modal */}
          {showNewWs && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col relative z-[10000]">
                <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Create New Workspace</h2>
                <input
                  type="text"
                  className="mb-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="Enter workspace name"
                  autoFocus
                />
                {wsError && <div className="text-red-500 text-sm mb-2">{wsError}</div>}
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    onClick={() => { setShowNewWs(false); setNewWsName(''); setWsError(''); }} 
                    className="px-6 py-2 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWsName || workspaces.length >= 3}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 text-white font-bold shadow-md hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Upgrade info (optional) */}
          <div className="mt-auto pt-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-2">Ready to go beyond this free plan?</div>
              <button className="bg-blue-500 text-white rounded px-4 py-2 font-semibold text-sm hover:bg-blue-600 transition">View plans</button>
            </div>
          </div>
        </aside>
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Main content */}
          <main className="flex-1 bg-gray-50 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceContextProvider>
  );
} 