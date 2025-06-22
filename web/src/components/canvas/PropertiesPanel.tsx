'use client';

import React, { useState } from 'react';
import { Node } from 'reactflow';
import { 
  Cog6ToothIcon, 
  DocumentTextIcon, 
  TagIcon,
  LinkIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, updates: any) => void;
}

export default function PropertiesPanel({ selectedNode, onUpdateNode }: PropertiesPanelProps) {
  const [name, setName] = useState(selectedNode?.data?.label || '');
  const [description, setDescription] = useState(selectedNode?.data?.description || '');
  const [port, setPort] = useState(selectedNode?.data?.port || '');
  const [env, setEnv] = useState(selectedNode?.data?.env || '');

  React.useEffect(() => {
    if (selectedNode) {
      setName(selectedNode.data?.label || '');
      setDescription(selectedNode.data?.description || '');
      setPort(selectedNode.data?.port || '');
      setEnv(selectedNode.data?.env || '');
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        label: name,
        description,
        port,
        env
      });
    }
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <ServerIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Component Selected
          </h3>
          <p className="text-sm text-gray-500">
            Click on a component to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TagIcon className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Basic Information</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter component name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the component's purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600">
                  {selectedNode.data?.serviceType || 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <LinkIcon className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Configuration</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3000, 8080"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment Variables
                </label>
                <textarea
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="NODE_ENV=production&#10;DB_HOST=localhost"
                />
              </div>
            </div>
          </div>

          {/* API Endpoints (if applicable) */}
          {selectedNode.data?.serviceType === 'microservice' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                <h4 className="font-medium text-gray-900">API Endpoints</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm font-mono">GET /health</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm font-mono">POST /api/data</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Active
                  </span>
                </div>
                <button className="w-full p-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50">
                  + Add Endpoint
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>

          {/* Component Info */}
          <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <span>Component ID:</span>
              <span className="font-mono">{selectedNode.id}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Position:</span>
              <span className="font-mono">
                {Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 