'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { A2AClient } from '@a2a-js/sdk';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import canvasApi from '@/lib/canvasApi';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect,
  NodeMouseHandler
} from 'reactflow';
import AgentInteractionPanel from './AgentInteractionPanel';
import ProgressVisualization from './ProgressVisualization';
import InteractiveComponentEditor from './InteractiveComponentEditor';

interface ArchitectureData {
  systemPatterns: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
  componentRelationships: Array<{
    sourceId: string;
    targetId: string;
    type: string;
    description: string;
  }>;
  diagram: {
    type: string;
    diagram: string;
  };
  recommendations: {
    scalability: Record<string, any>;
    optimization: Record<string, any>;
  };
  lastUpdated: Date | null;
}

interface CanvasEditorProps {
  canvasId?: string;
  projectId: string;
}

interface StreamEvent {
  type: string;
  data: any;
  timestamp: number;
  progress?: number;
  error?: string;
}

interface A2AConfig {
  apiKey: string;
  projectId: string;
  baseUrl: string;
}

interface StreamConnection {
  eventSource: EventSource | null;
  retryCount: number;
  lastEventTime: number;
  isReconnecting: boolean;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ canvasId, projectId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [streamStatus, setStreamStatus] = useState<string>('disconnected');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [architectureData, setArchitectureData] = useState<ArchitectureData | null>(null);
  const [isDesigningArchitecture, setIsDesigningArchitecture] = useState(false);
  
  // Phase 4 UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [showProgressPanel, setShowProgressPanel] = useState(true);
  const [showComponentEditor, setShowComponentEditor] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // ReactFlow handlers
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      // Apply the changes to nodes
      return nds; // For now, return unchanged - can be enhanced later
    });
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      // Apply the changes to edges
      return eds; // For now, return unchanged - can be enhanced later
    });
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    if (connection.source && connection.target) {
      setEdges((eds) => [...eds, { 
        ...connection, 
        id: `${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target
      } as Edge]);
    }
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    setShowComponentEditor(true);
  }, []);

  // Refs for managing stream connection
  const streamConnection = useRef<StreamConnection>({
    eventSource: null,
    retryCount: 0,
    lastEventTime: Date.now(),
    isReconnecting: false
  });
  
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000;
  const HEARTBEAT_INTERVAL = 30000;
  const CONNECTION_TIMEOUT = 5000;

  // Initialize A2A client with proper typing
  const a2aConfig = {
    apiKey: process.env.NEXT_PUBLIC_A2A_API_KEY || '',
    projectId: process.env.NEXT_PUBLIC_A2A_PROJECT_ID || '',
    baseUrl: process.env.NEXT_PUBLIC_A2A_BASE_URL || 'http://localhost:4001'
  };
  const a2aClient = new A2AClient(JSON.stringify(a2aConfig));

  // Handle stream errors with retry logic
  const handleStreamError = useCallback(async (error: Error | unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Stream error:', error);
    const conn = streamConnection.current;
    
    if (conn.retryCount < MAX_RETRIES && !conn.isReconnecting) {
      conn.isReconnecting = true;
      const delay = RETRY_DELAY * Math.pow(2, conn.retryCount);
      
      setStreamStatus('reconnecting');
      setError(`Connection lost. Retrying in ${delay/1000} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      conn.retryCount++;
      await startStreaming(conn.lastEventTime.toString());
    } else {
      setStreamStatus('error');
      setError('Failed to maintain connection after multiple retries');
    }
  }, []);

  // Monitor connection health
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    let connectionTimeout: NodeJS.Timeout | undefined;

    const checkConnection = () => {
      const conn = streamConnection.current;
      const timeSinceLastEvent = Date.now() - conn.lastEventTime;
      
      if (timeSinceLastEvent > HEARTBEAT_INTERVAL && !conn.isReconnecting) {
        handleStreamError(new Error('Connection timeout'));
      }
    };

    if (streamStatus === 'connected') {
      heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (connectionTimeout) clearTimeout(connectionTimeout);
    };
  }, [streamStatus, handleStreamError]);

  // Handle streaming updates with error boundaries
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    try {
      // Update last event time
      streamConnection.current.lastEventTime = Date.now();
      
      setStreamEvents(prev => [...prev, event]);

      // Update progress if available
      if (typeof event.progress === 'number') {
        setProgress(event.progress);
      }

      switch (event.type) {
        case 'canvas-update':
          setCanvasData(event.data);
          break;
        case 'architecture-update':
          setArchitectureData(event.data);
          break;
        case 'system-pattern':
          if (architectureData) {
            setArchitectureData(prev => prev ? {
              ...prev,
              systemPatterns: [...prev.systemPatterns, event.data]
            } : null);
          }
          break;
        case 'component-relationship':
          if (architectureData) {
            setArchitectureData(prev => prev ? {
              ...prev,
              componentRelationships: [...prev.componentRelationships, event.data]
            } : null);
          }
          break;
        case 'status':
          setStreamStatus(event.data.status);
          if (event.data.status === 'connected') {
            setError(null);
            streamConnection.current.retryCount = 0;
            streamConnection.current.isReconnecting = false;
          }
          break;
        case 'error':
          throw new Error(event.data.message);
        case 'completion':
          setStreamStatus('completed');
          setIsDesigningArchitecture(false);
          closeStream();
          break;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error handling stream event:', error);
      setError(`Error processing update: ${errorMessage}`);
    }
  }, [architectureData]);

  // Close stream connection
  const closeStream = useCallback(() => {
    const conn = streamConnection.current;
    if (conn.eventSource) {
      conn.eventSource.close();
      conn.eventSource = null;
    }
    setStreamStatus('disconnected');
  }, []);

  // Start streaming connection with enhanced error handling
  const startStreaming = useCallback(async (task: string) => {
    try {
      // Close existing connection if any
      closeStream();
      
      setStreamStatus('connecting');
      const clientId = `${user?.email || 'anonymous'}-${Date.now()}`;

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (streamStatus === 'connecting') {
          handleStreamError(new Error('Connection timeout'));
        }
      }, CONNECTION_TIMEOUT);

      // Start server-side streaming
      const response = await api.post('/api/canvas/stream/start', {
        task,
        clientId,
        projectId
      });

      clearTimeout(timeout);

      if (response.data.streamUrl) {
        // Connect to SSE stream
        const eventSource = new EventSource(response.data.streamUrl);
        streamConnection.current.eventSource = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleStreamEvent(data);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error parsing stream data:', err);
            setError(`Invalid stream data received: ${errorMessage}`);
          }
        };

        eventSource.onerror = (err) => {
          const error = err instanceof Error ? err : new Error('Stream connection error');
          handleStreamError(error);
        };

        eventSource.onopen = () => {
          setStreamStatus('connected');
          setError(null);
        };

        return () => {
          clearTimeout(timeout);
          closeStream();
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error starting stream:', err);
      setError(`Failed to start streaming: ${errorMessage}`);
      setStreamStatus('error');
    }
  }, [user, projectId, handleStreamEvent, closeStream, handleStreamError, streamStatus]);

  // Load existing canvas with error boundary
  useEffect(() => {
    const loadCanvas = async () => {
      if (canvasId) {
        try {
          const canvas = await canvasApi.getCanvas(canvasId);
          setCanvasData(canvas);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          console.error('Error loading canvas:', err);
          setError(`Failed to load canvas: ${errorMessage}`);
        }
      }
      setLoading(false);
    };

    loadCanvas();
  }, [canvasId]);

  // Load existing architecture
  useEffect(() => {
    const loadArchitecture = async () => {
      if (canvasId) {
        try {
          const architecture = await canvasApi.getArchitecture(canvasId);
          if (architecture) {
            setArchitectureData(architecture);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Error loading architecture:', error);
          setError(`Failed to load architecture: ${errorMessage}`);
        }
      }
    };

    loadArchitecture();
  }, [canvasId]);

  // Start architecture design
  const startArchitectureDesign = useCallback(async (requirements: any) => {
    try {
      setIsDesigningArchitecture(true);
      setError(null);

      const response = await api.post('/api/canvas/architecture', {
        projectType: requirements.projectType,
        requirements: requirements.requirements,
        constraints: requirements.constraints,
        existingComponents: requirements.existingComponents,
        scalabilityNeeds: requirements.scalabilityNeeds,
        clientId: `${user?.email || 'anonymous'}-${Date.now()}`
      });

      if (response.data.streamUrl) {
        await startStreaming(response.data.streamUrl);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error starting architecture design:', error);
      setError(`Failed to start architecture design: ${errorMessage}`);
      setIsDesigningArchitecture(false);
    }
  }, [user, startStreaming]);

  // Convert architecture data to ReactFlow nodes and edges
  const convertArchitectureToFlow = useCallback(() => {
    if (!architectureData) return { nodes: [], edges: [] };

    const nodes: Node[] = architectureData.systemPatterns.map(pattern => ({
      id: pattern.id,
      type: 'architectureNode',
      data: { label: pattern.name, type: pattern.type, description: pattern.description },
      position: { x: 0, y: 0 } // Position will be handled by layout algorithm
    }));

    const edges: Edge[] = architectureData.componentRelationships.map(rel => ({
      id: `${rel.sourceId}-${rel.targetId}`,
      source: rel.sourceId,
      target: rel.targetId,
      label: rel.type,
      data: { description: rel.description }
    }));

    return { nodes, edges };
  }, [architectureData]);

  // Handle user actions with error boundary
  const handleAction = async (action: string, data: any) => {
    try {
      setError(null);
      setProgress(0);
      
      const task = {
        type: action,
        data,
        canvasId,
        projectId
      };

      // Start streaming for this action
      await startStreaming(JSON.stringify(task));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error handling action:', err);
      setError(`Failed to process action: ${errorMessage}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  if (loading) return <div>Loading...</div>;
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-700 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
        {streamStatus === 'error' && (
          <button
            onClick={() => startStreaming(streamConnection.current.lastEventTime.toString())}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-gray-50">
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Main canvas area */}
      <div className="flex-1 relative">
        {/* Error display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Architecture design progress */}
        {isDesigningArchitecture && (
          <div className="absolute top-4 left-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50">
            <strong className="font-bold">Designing Architecture:</strong>
            <div className="w-full bg-blue-200 rounded h-2 mt-2">
              <div 
                className="bg-blue-600 rounded h-2 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <ReactFlow
          nodes={nodes.length > 0 ? nodes : convertArchitectureToFlow().nodes}
          edges={edges.length > 0 ? edges : convertArchitectureToFlow().edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          className="bg-white"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Toggle buttons for panels */}
        <div className="absolute top-4 right-4 flex space-x-2 z-40">
          <button
            onClick={() => setShowAgentPanel(!showAgentPanel)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAgentPanel 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            🤖 Agents
          </button>
          <button
            onClick={() => setShowProgressPanel(!showProgressPanel)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showProgressPanel 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            📊 Progress
          </button>
        </div>
      </div>

      {/* Right Side Panels */}
      <div className="flex flex-col w-96 border-l border-gray-200">
        {/* Agent Interaction Panel */}
        {showAgentPanel && (
          <div className="flex-1 min-h-0">
            <AgentInteractionPanel
              canvasState={{ nodes, edges }}
              projectId={projectId}
              onCanvasUpdate={(updates) => {
                if (updates.nodes) setNodes(updates.nodes);
                if (updates.edges) setEdges(updates.edges);
              }}
              onSuggestionApply={(suggestion) => {
                console.log('Applying suggestion:', suggestion);
                // Handle suggestion application
              }}
            />
          </div>
        )}

        {/* Progress Visualization Panel */}
        {showProgressPanel && (
          <div className="h-80 border-t border-gray-200">
            <ProgressVisualization
              streamStatus={streamStatus}
              progress={progress}
              agents={[
                {
                  id: 'arch-001',
                  name: 'Architecture Designer',
                  status: isDesigningArchitecture ? 'working' : 'idle',
                  specialty: 'System architecture and patterns',
                  avatar: '🏗️',
                  progress: progress
                },
                {
                  id: 'db-001',
                  name: 'Database Designer',
                  status: 'idle',
                  specialty: 'Data modeling and optimization',
                  avatar: '🗃️'
                },
                {
                  id: 'api-001',
                  name: 'API Designer',
                  status: 'idle',
                  specialty: 'API design and documentation',
                  avatar: '🔌'
                }
              ]}
              collaboration={null}
              streamEvents={streamEvents}
              onRetry={() => startStreaming(streamConnection.current.lastEventTime.toString())}
              onCancel={() => setIsDesigningArchitecture(false)}
            />
          </div>
        )}
      </div>

      {/* Interactive Component Editor (overlay) */}
      {showComponentEditor && selectedNode && (
        <div className="absolute right-0 top-0 h-full z-50">
          <InteractiveComponentEditor
            selectedNode={selectedNode}
            canvasState={{ nodes, edges }}
            onNodeUpdate={(nodeId, updates) => {
              setNodes(prev => prev.map(node => 
                node.id === nodeId 
                  ? { ...node, data: { ...node.data, ...updates } }
                  : node
              ));
            }}
            onClose={() => {
              setShowComponentEditor(false);
              setSelectedNode(null);
            }}
            projectId={projectId}
          />
        </div>
      )}

      {/* Architecture diagram overlay */}
      {architectureData?.diagram && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-40 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Architecture Diagram</h3>
          <div className="mermaid text-xs">
            {architectureData.diagram.diagram}
          </div>
        </div>
      )}
    </div>
  );
}; 