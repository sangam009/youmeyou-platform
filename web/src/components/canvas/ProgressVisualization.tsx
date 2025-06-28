'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ProgressVisualizationProps {
  streamStatus: string;
  progress: number;
  agents: Agent[];
  collaboration: CollaborationFlow | null;
  streamEvents: StreamEvent[];
  onRetry?: () => void;
  onCancel?: () => void;
}

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  specialty: string;
  currentTask?: string;
  progress?: number;
  avatar: string;
  estimatedTime?: number;
  actualTime?: number;
}

interface StreamEvent {
  type: string;
  data: any;
  timestamp: number;
  progress?: number;
  error?: string;
  agentId?: string;
}

interface CollaborationFlow {
  id: string;
  agents: Agent[];
  currentStep: number;
  totalSteps: number;
  sharedContext: any;
  status: 'planning' | 'executing' | 'completed' | 'error';
  startTime?: number;
  estimatedDuration?: number;
}

interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  tokensUsed: number;
  costEstimate: number;
}

export const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({
  streamStatus,
  progress,
  agents,
  collaboration,
  streamEvents,
  onRetry,
  onCancel
}) => {
  const [metrics, setMetrics] = useState<TaskMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageResponseTime: 0,
    tokensUsed: 0,
    costEstimate: 0
  });
  
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Calculate metrics from events
  useEffect(() => {
    const completedEvents = streamEvents.filter(e => e.type === 'completion');
    const errorEvents = streamEvents.filter(e => e.type === 'error');
    const responseEvents = streamEvents.filter(e => e.type === 'response');
    
    const avgResponseTime = responseEvents.length > 0 
      ? responseEvents.reduce((sum, event) => sum + (event.timestamp || 0), 0) / responseEvents.length 
      : 0;

    setMetrics({
      totalTasks: streamEvents.length,
      completedTasks: completedEvents.length,
      failedTasks: errorEvents.length,
      averageResponseTime: avgResponseTime,
      tokensUsed: streamEvents.reduce((sum, e) => sum + (e.data?.tokens || 0), 0),
      costEstimate: streamEvents.reduce((sum, e) => sum + (e.data?.cost || 0), 0)
    });
  }, [streamEvents]);

  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [streamEvents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'disconnected': return 'text-red-600 bg-red-100';
      case 'reconnecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getEstimatedCompletion = () => {
    if (!collaboration || collaboration.status === 'completed') return null;
    
    const elapsed = collaboration.startTime ? Date.now() - collaboration.startTime : 0;
    const progressRatio = (collaboration.currentStep + 1) / collaboration.totalSteps;
    const estimated = progressRatio > 0 ? (elapsed / progressRatio) - elapsed : 0;
    
    return estimated > 0 ? formatDuration(estimated) : null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Progress & Monitoring</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(streamStatus)}`}>
              {streamStatus.charAt(0).toUpperCase() + streamStatus.slice(1)}
            </span>
            {streamStatus === 'error' && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Progress Section */}
      <div className="p-4 space-y-6">
        
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Overall Progress</h4>
            <span className="text-sm text-gray-600">{Math.round(progress * 100)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          {getEstimatedCompletion() && (
            <div className="text-xs text-gray-500">
              Estimated completion: {getEstimatedCompletion()}
            </div>
          )}
        </div>

        {/* Agent Status Grid */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Agent Status</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedAgent === agent.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {agent.specialty}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'idle' ? 'bg-gray-400' :
                    agent.status === 'working' ? 'bg-yellow-400 animate-pulse' :
                    agent.status === 'completed' ? 'bg-green-400' :
                    'bg-red-400'
                  }`} />
                </div>
                
                {agent.currentTask && (
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {agent.currentTask}
                  </div>
                )}
                
                {agent.progress !== undefined && agent.progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{Math.round(agent.progress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Performance indicators */}
                <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                  {agent.estimatedTime && (
                    <span>⏱️ {formatDuration(agent.estimatedTime)}</span>
                  )}
                  {agent.actualTime && (
                    <span className={agent.actualTime <= (agent.estimatedTime || Infinity) ? 'text-green-600' : 'text-yellow-600'}>
                      ✓ {formatDuration(agent.actualTime)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collaboration Flow */}
        {collaboration && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Collaboration Flow</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Step {collaboration.currentStep + 1} of {collaboration.totalSteps}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  collaboration.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                  collaboration.status === 'executing' ? 'bg-blue-100 text-blue-800' :
                  collaboration.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {collaboration.status}
                </span>
              </div>
              
              <div className="space-y-2">
                {collaboration.agents.map((agent, index) => (
                  <div key={agent.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index < collaboration.currentStep ? 'bg-green-500 text-white' :
                      index === collaboration.currentStep ? 'bg-blue-500 text-white animate-pulse' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-lg">{agent.avatar}</span>
                    <span className="flex-1 text-sm text-gray-700">{agent.name}</span>
                    {index < collaboration.currentStep && (
                      <span className="text-green-500 text-sm">✓</span>
                    )}
                    {index === collaboration.currentStep && collaboration.status === 'executing' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Performance Metrics</h4>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{metrics.completedTasks}</div>
              <div className="text-xs text-blue-700">Completed Tasks</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {metrics.averageResponseTime > 0 ? `${(metrics.averageResponseTime / 1000).toFixed(1)}s` : '0s'}
              </div>
              <div className="text-xs text-green-700">Avg Response Time</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.tokensUsed.toLocaleString()}
              </div>
              <div className="text-xs text-purple-700">Tokens Used</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">
                ${metrics.costEstimate.toFixed(3)}
              </div>
              <div className="text-xs text-orange-700">Est. Cost</div>
            </div>
          </div>
        </div>

        {/* Detailed Events Log */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Event Stream</h4>
            <div 
              ref={eventsRef}
              className="bg-gray-50 rounded-lg p-3 h-64 overflow-y-auto"
            >
              {streamEvents.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No events yet. Start a task to see real-time updates.
                </div>
              ) : (
                <div className="space-y-2">
                  {streamEvents.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-400 font-mono text-xs mt-0.5">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        event.type === 'error' ? 'bg-red-100 text-red-700' :
                        event.type === 'completion' ? 'bg-green-100 text-green-700' :
                        event.type === 'progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {event.type}
                      </span>
                      <span className="flex-1 text-gray-700">
                        {typeof event.data === 'string' ? event.data : JSON.stringify(event.data, null, 2).substring(0, 100)}
                        {event.error && ` - Error: ${event.error}`}
                      </span>
                      {event.agentId && (
                        <span className="text-xs text-gray-500">{event.agentId}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(streamStatus === 'error' || streamStatus === 'disconnected') && (
          <div className="flex items-center space-x-3 pt-3 border-t border-gray-200">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressVisualization; 