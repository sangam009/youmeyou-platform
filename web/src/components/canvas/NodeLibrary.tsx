'use client';

import React from 'react';
import { 
  ServerIcon, 
  CircleStackIcon, 
  CloudIcon, 
  ShieldCheckIcon,
  CpuChipIcon,
  QueueListIcon,
  GlobeAltIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface NodeLibraryProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

const architectureComponents = [
  {
    type: 'microservice',
    name: 'Microservice',
    icon: ServerIcon,
    description: 'Independent service component',
    color: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  {
    type: 'database',
    name: 'Database',
    icon: CircleStackIcon,
    description: 'Data storage layer',
    color: 'bg-green-50 border-green-200 text-green-700'
  },
  {
    type: 'api',
    name: 'API Gateway',
    icon: GlobeAltIcon,
    description: 'API management and routing',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  },
  {
    type: 'security',
    name: 'Security',
    icon: ShieldCheckIcon,
    description: 'Authentication and authorization',
    color: 'bg-red-50 border-red-200 text-red-700'
  },
  {
    type: 'queue',
    name: 'Message Queue',
    icon: QueueListIcon,
    description: 'Async message processing',
    color: 'bg-purple-50 border-purple-200 text-purple-700'
  },
  {
    type: 'cache',
    name: 'Cache',
    icon: BoltIcon,
    description: 'High-speed data cache',
    color: 'bg-orange-50 border-orange-200 text-orange-700'
  },
  {
    type: 'loadbalancer',
    name: 'Load Balancer',
    icon: CpuChipIcon,
    description: 'Traffic distribution',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700'
  },
  {
    type: 'external',
    name: 'External Service',
    icon: CloudIcon,
    description: 'Third-party integration',
    color: 'bg-gray-50 border-gray-200 text-gray-700'
  }
];

export default function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddClick = (nodeType: string) => {
    // Add node at center of canvas
    onAddNode(nodeType, { x: 300, y: 200 });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Architecture Components
        </h3>
        
        <div className="space-y-2">
          {architectureComponents.map((component) => {
            const IconComponent = component.icon;
            
            return (
              <div
                key={component.type}
                draggable
                onDragStart={(e) => handleDragStart(e, component.type)}
                onClick={() => handleAddClick(component.type)}
                className={`
                  p-3 rounded-lg border-2 border-dashed cursor-pointer 
                  hover:shadow-md transition-all duration-200 hover:scale-102
                  ${component.color}
                `}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{component.name}</div>
                    <div className="text-xs opacity-75 truncate">
                      {component.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Quick Templates
          </h4>
          
          <div className="space-y-2">
            <button
              onClick={() => {
                // Add microservices template
                onAddNode('microservice', { x: 100, y: 100 });
                onAddNode('database', { x: 300, y: 100 });
                onAddNode('api', { x: 200, y: 200 });
              }}
              className="w-full p-3 text-left bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:shadow-md transition-all"
            >
              <div className="font-medium text-sm text-blue-700">
                Basic Microservice
              </div>
              <div className="text-xs text-blue-600 opacity-75">
                Service + Database + API
              </div>
            </button>
            
            <button
              onClick={() => {
                // Add full stack template
                onAddNode('loadbalancer', { x: 200, y: 50 });
                onAddNode('api', { x: 200, y: 150 });
                onAddNode('microservice', { x: 100, y: 250 });
                onAddNode('microservice', { x: 300, y: 250 });
                onAddNode('database', { x: 200, y: 350 });
                onAddNode('cache', { x: 350, y: 150 });
              }}
              className="w-full p-3 text-left bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg hover:shadow-md transition-all"
            >
              <div className="font-medium text-sm text-green-700">
                Full Stack Template
              </div>
              <div className="text-xs text-green-600 opacity-75">
                Load Balancer + Services + Cache
              </div>
            </button>
          </div>
        </div>

        <div className="mt-8 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-1">
            💡 Pro Tip
          </div>
          <div className="text-xs text-blue-600">
            Drag components to canvas or click to add at center. 
            Connect services by dragging between nodes.
          </div>
        </div>
      </div>
    </div>
  );
} 