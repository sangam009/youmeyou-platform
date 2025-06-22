'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';

interface CollaborationBarProps {
  canvasId?: string;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActivity: Date;
  status: 'active' | 'idle' | 'away';
}

// Mock active users (replace with real WebSocket data)
const mockUsers: ActiveUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    color: '#3b82f6',
    cursor: { x: 250, y: 150 },
    lastActivity: new Date(),
    status: 'active'
  },
  {
    id: '2', 
    name: 'Sarah Chen',
    email: 'sarah@company.com',
    color: '#10b981',
    cursor: { x: 400, y: 300 },
    lastActivity: new Date(Date.now() - 30000), // 30 seconds ago
    status: 'active'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@company.com',
    color: '#f59e0b',
    lastActivity: new Date(Date.now() - 120000), // 2 minutes ago
    status: 'idle'
  }
];

export default function CollaborationBar({ canvasId }: CollaborationBarProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>(mockUsers);
  const [showUserList, setShowUserList] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setActiveUsers(current => 
        current.map(user => ({
          ...user,
          cursor: user.status === 'active' ? {
            x: user.cursor?.x ? user.cursor.x + (Math.random() - 0.5) * 20 : Math.random() * 800,
            y: user.cursor?.y ? user.cursor.y + (Math.random() - 0.5) * 20 : Math.random() * 600
          } : user.cursor,
          lastActivity: user.status === 'active' ? new Date() : user.lastActivity
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleUserInvite = () => {
    // TODO: Implement user invitation
    console.log('Invite user to collaborate');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-400';
      case 'idle': return 'bg-yellow-400';
      case 'away': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <div className="flex items-center space-x-3">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Active Users */}
        <div className="flex items-center space-x-1">
          {activeUsers.slice(0, 4).map((user, index) => (
            <div
              key={user.id}
              className="relative group"
              style={{ zIndex: activeUsers.length - index }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm cursor-pointer"
                style={{ backgroundColor: user.color }}
                onClick={() => setShowUserList(!showUserList)}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              
              {/* Status indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${getStatusColor(user.status)}`}></div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {user.name}
                  <div className="text-xs text-gray-300">{user.status}</div>
                </div>
              </div>
            </div>
          ))}
          
          {activeUsers.length > 4 && (
            <div 
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-medium border border-gray-200 cursor-pointer"
              onClick={() => setShowUserList(!showUserList)}
            >
              +{activeUsers.length - 4}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUserInvite}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Invite users"
          >
            <UserGroupIcon className="w-4 h-4" />
          </button>
          
          <button
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Toggle chat"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
          </button>
          
          <button
            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Follow mode"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded User List */}
      {showUserList && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`}></div>
                  <span className="text-xs text-gray-500 capitalize">{user.status}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleUserInvite}
            className="w-full mt-3 p-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
          >
            + Invite more users
          </button>
        </div>
      )}

      {/* Live Cursors (would be rendered on canvas) */}
      {activeUsers.map((user) => 
        user.cursor && user.status === 'active' ? (
          <div
            key={`cursor-${user.id}`}
            className="fixed pointer-events-none z-50"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-2px, -2px)'
            }}
          >
            <CursorArrowRaysIcon 
              className="w-5 h-5" 
              style={{ color: user.color }}
            />
            <div 
              className="absolute top-6 left-0 px-2 py-1 text-white text-xs rounded whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
} 