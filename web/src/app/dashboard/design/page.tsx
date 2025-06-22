'use client';

import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Connection, addEdge, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkspaceContext } from '../layout';
import { 
  PlusIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  ShareIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  EyeIcon,
  PlayIcon,
  CloudArrowUpIcon,
  BeakerIcon,
  BoltIcon,
  BellIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { getWorkspaces } from '@/lib/dashboardApi';

// Enhanced node types with scalability properties
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 400, y: 200 },
    data: { 
      label: 'API Gateway',
      serviceType: 'api',
      description: 'Main entry point for all requests',
      properties: {
        rps: 50000,
        instances: 3,
        cpuLimit: '2000m',
        memoryLimit: '4Gi',
        autoscaling: true,
        minReplicas: 2,
        maxReplicas: 10
      }
    },
  },
];

const initialEdges: Edge[] = [];

// Floating component toolbar items - Enhanced with more granular options
const componentLibrary = [
  { 
    type: 'microservice', 
    label: 'Microservice', 
    icon: '🚀',
    color: 'bg-blue-500',
    defaultProps: { rps: 10000, instances: 2, cpuLimit: '1000m', memoryLimit: '2Gi' }
  },
  { 
    type: 'database', 
    label: 'Database', 
    icon: '🗄️',
    color: 'bg-green-500',
    defaultProps: { storage: '100Gi', connections: 1000, backupEnabled: true }
  },
  { 
    type: 'cache', 
    label: 'Cache', 
    icon: '⚡',
    color: 'bg-orange-500',
    defaultProps: { memory: '8Gi', eviction: 'lru', ttl: 3600 }
  },
  { 
    type: 'queue', 
    label: 'Message Queue', 
    icon: '📬',
    color: 'bg-purple-500',
    defaultProps: { throughput: 100000, retention: '7d', partitions: 12 }
  },
  { 
    type: 'loadbalancer', 
    label: 'Load Balancer', 
    icon: '⚖️',
    color: 'bg-indigo-500',
    defaultProps: { algorithm: 'round-robin', healthCheck: true, sslTermination: true }
  },
  { 
    type: 'security', 
    label: 'Security Gateway', 
    icon: '🔒',
    color: 'bg-red-500',
    defaultProps: { authMethod: 'JWT', rateLimiting: true, encryption: 'AES-256' }
  },
  { 
    type: 'analytics', 
    label: 'Analytics Engine', 
    icon: '📊',
    color: 'bg-teal-500',
    defaultProps: { dataRetention: '30d', realtime: true, aggregation: 'hourly' }
  },
  { 
    type: 'cdn', 
    label: 'CDN', 
    icon: '🌐',
    color: 'bg-pink-500',
    defaultProps: { regions: 12, caching: '1h', compression: true }
  },
  { 
    type: 'storage', 
    label: 'File Storage', 
    icon: '💾',
    color: 'bg-cyan-500',
    defaultProps: { capacity: '1TB', replication: 3, encryption: true }
  },
  { 
    type: 'notification', 
    label: 'Notification Service', 
    icon: '🔔',
    color: 'bg-yellow-500',
    defaultProps: { channels: ['email', 'sms', 'push'], throughput: 50000 }
  },
  { 
    type: 'search', 
    label: 'Search Engine', 
    icon: '🔍',
    color: 'bg-gray-500',
    defaultProps: { indexSize: '100GB', queryLatency: '50ms', shards: 5 }
  },
  { 
    type: 'monitoring', 
    label: 'Monitoring', 
    icon: '📈',
    color: 'bg-emerald-500',
    defaultProps: { metrics: true, logs: true, traces: true, retention: '90d' }
  }
];

function DesignCanvasPage() {
  // Get workspace context
  const { activeWorkspace, setActiveWorkspace } = useContext(WorkspaceContext);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Component state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [showComponentToolbar, setShowComponentToolbar] = useState(true);
  const [isCollaborating, setIsCollaborating] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [agentContext, setAgentContext] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState<'design' | 'deploy'>('design');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'agent', content: string, timestamp: Date}>>([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // Collaboration state - dynamic based on actual sharing
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isSharedSession, setIsSharedSession] = useState(false);
  
  // Workspace and notification state
  const [workspaces, setWorkspaces] = useState<{ id: string, name: string }[]>([]);
  const [wsDropdown, setWsDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Deploy mode state - moved to top level to avoid conditional hooks
  const [selectedComponent, setSelectedComponent] = useState<Node | null>(null);
  const [playgroundMode, setPlaygroundMode] = useState<'overview' | 'test' | 'code'>('overview');
  const [testRequest, setTestRequest] = useState('{\n  "method": "GET",\n  "endpoint": "/api/test",\n  "payload": {}\n}');
  const [testResponse, setTestResponse] = useState('');

  // Load workspaces on component mount
  useEffect(() => {
    getWorkspaces().then(data => {
      setWorkspaces(data);
    }).catch(console.error);
  }, []);

  // Scroll to bottom when chat messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAgentTyping]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wsDropdown && !(event.target as Element).closest('.workspace-dropdown')) {
        setWsDropdown(false);
      }
      if (showNotifications && !(event.target as Element).closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wsDropdown, showNotifications]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const addComponent = useCallback((componentType: string, position?: { x: number; y: number }) => {
    if (componentType === 'custom') {
      // Create a custom component with default properties
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'default',
        position: position || { x: Math.random() * 500 + 200, y: Math.random() * 300 + 100 },
        data: {
          label: 'Custom Component',
          serviceType: 'custom',
          description: 'Custom service component',
          properties: {
            customProperty: 'value',
            enabled: true,
            instances: 1
          }
        }
      };
      setNodes((nds) => [...nds, newNode]);
      return;
    }

    const component = componentLibrary.find(c => c.type === componentType);
    if (!component) return;

    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'default',
      position: position || { x: Math.random() * 500 + 200, y: Math.random() * 300 + 100 },
      data: {
        label: component.label,
        serviceType: componentType,
        description: `New ${component.label.toLowerCase()}`,
        properties: component.defaultProps
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const openAgentChat = useCallback((node?: Node) => {
    setAgentContext(node || selectedNode);
    setShowAgentChat(true);
    
    // Add welcome message if no messages exist
    if (chatMessages.length === 0) {
      const welcomeMessage = {
        id: 'welcome-' + Date.now(),
        type: 'agent' as const,
        content: node 
          ? `Hi! I'm Archie, your architecture buddy! I can see you're working on "${node.data.label}". How can I help you optimize this component or improve your overall architecture?`
          : "Hi! I'm Archie, your architecture buddy! I'm here to help you design, optimize, and improve your system architecture. What would you like to work on today?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, [selectedNode, chatMessages.length]);

  const handleDeploy = useCallback(async () => {
    setIsDeploying(true);
    setCurrentMode('deploy');
    // Simulate deployment process
    setTimeout(() => {
      setIsDeploying(false);
      setCurrentMode('design');
    }, 3000);
  }, []);

  const updateNodeProperties = useCallback((nodeId: string, properties: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId 
          ? { ...node, data: { ...node.data, properties: { ...node.data.properties, ...properties } } }
          : node
      )
    );
  }, [setNodes]);

  const generateCode = useCallback(async (node: Node) => {
    try {
      // Prepare the A2A task for code generation
      const task = {
        type: 'generate-code',
        content: `Generate production-ready code for ${node.data.label} component. This is a ${node.data.serviceType} with the following requirements: ${node.data.description || 'Basic implementation'}. 
        
        Functional Requirements: ${node.data.functionalRequirements || 'Standard microservice functionality'}
        
        Please generate:
        1. Complete Node.js/Express.js service code
        2. Dockerfile for containerization
        3. API documentation
        4. Test files
        5. Environment configuration
        6. README with setup instructions`,
        component: node,
        canvasState: {
          nodes: nodes,
          edges: edges
        }
      };

      // Call the A2A service
      const response = await fetch('http://localhost:4000/agents/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        throw new Error(`A2A service error: ${response.status}`);
      }

      const result = await response.json();
      
      // Display the generated code (you can enhance this with a modal or dedicated view)
      console.log('Generated code:', result);
      
      // Open agent chat with the code generation result
      setAgentContext({
        ...node,
        generatedCode: result
      });
      setShowAgentChat(true);
      
    } catch (error) {
      console.error('Error generating code:', error);
      // Fallback to opening agent chat for manual assistance
      setAgentContext(node);
      setShowAgentChat(true);
    }
  }, [nodes, edges]);

  const previewComponent = useCallback((node: Node) => {
    setCurrentMode('deploy');
    setSelectedNode(node);
    // Switch to deploy mode to show component details
    console.log('Viewing component in deploy mode:', node);
  }, []);

  // Chat functionality
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isAgentTyping) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAgentTyping(true);

    try {
      // Call the agent API with full canvas context
      const response = await fetch('http://localhost:4000/agents/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat',
          content: chatInput,
          canvasState: { nodes, edges },
          context: agentContext ? {
            component: agentContext,
            canvasState: { nodes, edges }
          } : { canvasState: { nodes, edges } },
          currentMode: currentMode,
          selectedComponent: selectedNode?.data?.label || null
        })
      });

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Extract the response content from the API structure
      let responseContent = "I'm here to help with your architecture! Could you tell me more about what you're trying to build?";
      let agentActions = [];
      
      if (result.status === 'success' && result.data) {
        const agentResponse = result.data.response;
        if (agentResponse && agentResponse.data && agentResponse.data.analysis) {
          responseContent = agentResponse.data.analysis;
        } else if (agentResponse && agentResponse.raw) {
          // Extract content from raw response if structured analysis isn't available
          responseContent = agentResponse.raw.replace(/```json|```/g, '').trim();
          try {
            const parsed = JSON.parse(responseContent);
            responseContent = parsed.analysis || parsed.content || responseContent;
          } catch (e) {
            // If parsing fails, use the raw content
          }
        } else if (typeof agentResponse === 'string') {
          responseContent = agentResponse;
        }

        // Check for processed actions
        if (agentResponse && agentResponse.processedActions) {
          agentActions = agentResponse.processedActions;
        }
      }
      
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent' as const,
        content: responseContent,
        timestamp: new Date(),
        actions: agentActions
      };

      setChatMessages(prev => [...prev, agentMessage]);

      // Process any actions from the agent
      if (agentActions.length > 0) {
        await processAgentActions(agentActions);
      }
      
    } catch (error) {
      console.error('Error sending message to agent:', error);
      
      // Fallback response
      const fallbackMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent' as const,
        content: "I'm having trouble connecting to my AI brain right now, but I'm still here to help! Could you tell me more about your architecture needs?",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsAgentTyping(false);
    }
  }, [chatInput, isAgentTyping, agentContext, nodes, edges]);

  const handleChatKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Process actions suggested by the agent
  const processAgentActions = useCallback(async (actions: any[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'ADD_COMPONENT':
            if (action.component) {
              setNodes((nds) => [...nds, action.component]);
              console.log('Added component:', action.component.data.label);
            }
            break;
          
          case 'UPDATE_COMPONENT':
            if (action.componentId && action.updates) {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === action.componentId
                    ? { ...node, data: { ...node.data, ...action.updates } }
                    : node
                )
              );
              console.log('Updated component:', action.componentId);
            }
            break;
          
          case 'CONNECT_COMPONENTS':
            if (action.connection) {
              setEdges((eds) => [...eds, action.connection]);
              console.log('Added connection:', action.connection.source, '->', action.connection.target);
            }
            break;
          
          case 'REMOVE_COMPONENT':
            if (action.componentId) {
              setNodes((nds) => nds.filter((node) => node.id !== action.componentId));
              setEdges((eds) => eds.filter((edge) => 
                edge.source !== action.componentId && edge.target !== action.componentId
              ));
              console.log('Removed component:', action.componentId);
            }
            break;
          
          case 'OPTIMIZE_LAYOUT':
            if (action.optimizedPositions) {
              setNodes((nds) =>
                nds.map((node) => ({
                  ...node,
                  position: action.optimizedPositions[node.id] || node.position
                }))
              );
              console.log('Optimized layout for', Object.keys(action.optimizedPositions).length, 'components');
            }
            break;
          
          default:
            console.log('Action processed:', action.type, '-', action.message);
            break;
        }
      } catch (error) {
        console.error('Error processing action:', action.type, error);
      }
    }
  }, [setNodes, setEdges]);

  const handleShare = useCallback(async () => {
    try {
      // Generate a unique share token
      const newShareToken = `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setShareToken(newShareToken);
      
      // Create shareable URL
      const shareUrl = `${window.location.origin}/dashboard/design?share=${newShareToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      // Update state to show shared status
      setIsSharedSession(true);
      setActiveUsers([
        { id: 1, name: 'You', avatar: 'Y', color: 'bg-blue-500', cursor: { x: 100, y: 100 } }
      ]);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setIsSharedSession(false);
      }, 3000);
      
      console.log('Canvas shared! URL copied to clipboard:', shareUrl);
    } catch (error) {
      console.error('Failed to share canvas:', error);
      // Fallback: just toggle shared status
      setIsSharedSession(true);
      setTimeout(() => setIsSharedSession(false), 3000);
    }
  }, []);

  // Deploy mode render function
  const renderDeployMode = (): React.ReactElement => {
    const runTest = async () => {
      // Simulate API test
      setTestResponse('{\n  "status": "success",\n  "data": {\n    "message": "Service is running!",\n    "timestamp": "' + new Date().toISOString() + '",\n    "latency": "42ms"\n  }\n}');
    };

    return (
      <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">🚀 Deploy & Generate</h2>
                <p className="text-gray-600 mt-1">Deploy your architecture and test services with the playground</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50"
                >
                  {isDeploying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deploying...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-5 h-5" />
                      <span className="font-medium">Deploy All</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCurrentMode('design')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Back to Design
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Components List */}
            <div className="col-span-4">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🏗️ Your Components</h3>
                <div className="space-y-3">
                  {nodes.map((node) => {
                    const component = componentLibrary.find(c => c.type === node.data.serviceType);
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedComponent(node)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedComponent?.id === node.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${component?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center text-white text-sm`}>
                            {component?.icon || '📦'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{node.data.label}</h4>
                            <p className="text-sm text-gray-500 capitalize">{node.data.serviceType}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateCode(node);
                              }}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                            >
                              Code
                            </button>
                            {node.data.serviceType === 'microservice' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedComponent(node);
                                  setPlaygroundMode('test');
                                }}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                              >
                                Test
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {nodes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BeakerIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No components yet</p>
                      <p className="text-sm">Add components in Design mode</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-8">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                {selectedComponent ? (
                  <>
                                         {/* Component Header */}
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center space-x-3">
                         <div className={`w-12 h-12 ${componentLibrary.find(c => c.type === selectedComponent.data.serviceType)?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center text-white text-lg`}>
                           {componentLibrary.find(c => c.type === selectedComponent.data.serviceType)?.icon || '📦'}
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-gray-900">{selectedComponent.data.label}</h3>
                           <p className="text-gray-500 capitalize">{selectedComponent.data.serviceType}</p>
                         </div>
                       </div>
                       <div className="flex bg-gray-100 rounded-lg p-1">
                         {['overview', 'test', 'code'].map((mode) => (
                           <button
                             key={mode}
                             onClick={() => setPlaygroundMode(mode as any)}
                             className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                               playgroundMode === mode
                                 ? 'bg-white text-blue-600 shadow-sm'
                                 : 'text-gray-600 hover:text-gray-900'
                             }`}
                           >
                             {mode === 'overview' ? '📋 Overview' : mode === 'test' ? '🧪 Playground' : '💻 Code'}
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Content Based on Mode */}
                     {playgroundMode === 'overview' && (
                       <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                           {selectedComponent.data.properties && Object.entries(selectedComponent.data.properties).map(([key, value]) => (
                             <div key={key} className="bg-gray-50 rounded-lg p-4">
                               <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                                 {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                               </label>
                               {typeof value === 'boolean' ? (
                                 <button
                                   onClick={() => updateNodeProperties(selectedComponent.id, { [key]: !value })}
                                   className={`w-full p-2 rounded border text-left transition-all ${
                                     value ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                                   }`}
                                 >
                                   {value ? '✅ Enabled' : '❌ Disabled'}
                                 </button>
                               ) : (
                                 <input
                                   type={typeof value === 'number' ? 'number' : 'text'}
                                   value={value as string | number}
                                   onChange={(e) => updateNodeProperties(selectedComponent.id, { 
                                     [key]: typeof value === 'number' ? parseInt(e.target.value) : e.target.value 
                                   })}
                                   className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 />
                               )}
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {playgroundMode === 'test' && selectedComponent.data.serviceType === 'microservice' && (
                       <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-6">
                           <div>
                             <h4 className="font-medium text-gray-900 mb-3">🚀 Test Request</h4>
                             <textarea
                               value={testRequest}
                               onChange={(e) => setTestRequest(e.target.value)}
                               className="w-full h-64 p-4 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Enter your test request..."
                             />
                             <button
                               onClick={runTest}
                               className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                             >
                               🧪 Run Test
                             </button>
                           </div>
                           <div>
                             <h4 className="font-medium text-gray-900 mb-3">📡 Response</h4>
                             <div className="w-full h-64 p-4 border border-gray-200 rounded-lg bg-gray-50 font-mono text-sm overflow-auto">
                               {testResponse || 'Click "Run Test" to see the response...'}
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {playgroundMode === 'code' && (
                       <div className="space-y-4">
                         <div className="flex items-center justify-between">
                           <h4 className="font-medium text-gray-900">💻 Generated Code</h4>
                           <button
                             onClick={() => generateCode(selectedComponent)}
                             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                           >
                             🔄 Regenerate
                           </button>
                         </div>
                         <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm h-96 overflow-auto">
                           {`// ${selectedComponent.data.label} - ${selectedComponent.data.serviceType}
const express = require('express');
const app = express();
const port = ${selectedComponent.data.properties?.port || 3000};

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: '${selectedComponent.data.label}',
    timestamp: new Date().toISOString()
  });
});

// Main API endpoints
app.get('/api/${selectedComponent.data.label.toLowerCase()}', (req, res) => {
  res.json({
    message: 'Hello from ${selectedComponent.data.label}!',
    data: []
  });
});

app.listen(port, () => {
  console.log(\`${selectedComponent.data.label} running on port \${port}\`);
});

module.exports = app;`}
                         </div>
                       </div>
                     )}
                   </>
                 ) : (
                   <div className="text-center py-16 text-gray-500">
                     <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                     <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Component</h3>
                     <p>Choose a component from the left to view details, test, or generate code</p>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       </div>
     );
   };

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">No Workspace Selected</h2>
          <p className="text-gray-500 mt-2">Please select a workspace to start designing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      {/* Revolutionary Header Bar */}
      <div className="h-16 bg-white/80 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-6 shadow-lg relative z-50">
        <div className="flex items-center space-x-6">
          {/* Workspace Selector */}
          <div className="relative workspace-dropdown">
            <button
              className="font-semibold text-lg text-gray-900 flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition"
              onClick={() => setWsDropdown(v => !v)}
            >
              {activeWorkspace ? activeWorkspace.name : 'No workspace'}
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {wsDropdown && (
              <div className="absolute left-0 top-12 bg-white border border-gray-100 rounded-lg shadow-xl z-20 w-48">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws); setWsDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg ${activeWorkspace?.id === ws.id ? 'bg-blue-100 text-blue-700' : ''}`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BeakerIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['design', 'deploy'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrentMode(mode)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  currentMode === mode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'deploy' ? 'Deploy & Generate' : mode}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Notification Bell */}
          <div className="relative notification-dropdown">
            <button 
              className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all" 
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <BellIcon className="w-6 h-6" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-lg shadow-xl z-20 w-64">
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Notifications</h3>
                  <div className="text-sm text-gray-500">No new notifications</div>
                </div>
              </div>
            )}
          </div>

          {/* Collaboration Bar - Only show when actually shared */}
          {isSharedSession && activeUsers.length > 0 && (
            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
              <div className="flex -space-x-2">
                {activeUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`w-8 h-8 ${user.color} rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}
                    title={user.name}
                  >
                    {user.avatar}
                  </div>
                ))}
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Live</span>
            </div>
          )}

          <button
            onClick={() => setShowAgentChat(!showAgentChat)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <SparklesIcon className="w-5 h-5" />
            <span className="font-medium">🤖 Archie</span>
          </button>

          <button
            onClick={handleShare}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              isSharedSession
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShareIcon className="w-5 h-5" />
            <span className="font-medium">{isSharedSession ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Floating Component Toolbar */}
        {showComponentToolbar && (
          <div className="absolute top-6 left-6 z-40 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Components</h3>
              <button
                onClick={() => setShowComponentToolbar(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 w-64">
              {componentLibrary.map((component) => (
                <button
                  key={component.type}
                  onClick={() => addComponent(component.type)}
                  className="flex items-center space-x-2 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all group"
                >
                  <div className={`w-8 h-8 ${component.color} rounded-lg flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform`}>
                    {component.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{component.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => addComponent('custom')}
              className="w-full mt-3 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Custom Component</span>
            </button>
          </div>
        )}

        {/* Canvas or Deploy Mode */}
        {currentMode === 'deploy' ? (
          renderDeployMode()
        ) : (
          <div ref={canvasRef} className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeMouseEnter={onNodeMouseEnter}
              onNodeMouseLeave={onNodeMouseLeave}
              fitView
              className="bg-transparent"
            >
              <Background 
                color="#e2e8f0" 
                gap={25} 
                size={1}
                style={{ opacity: 0.5 }}
              />
              <Controls 
                className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/30 rounded-xl"
                showZoom={true}
                showFitView={true}
                showInteractive={true}
              />
              <MiniMap 
                className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/30 rounded-xl"
                nodeColor={(node) => {
                  const component = componentLibrary.find(c => c.type === node.data?.serviceType);
                  return component?.color.replace('bg-', '#') || '#6b7280';
                }}
                pannable
                zoomable
              />
            </ReactFlow>
          </div>
        )}

        {/* Floating Agent Button for Hovered Node */}
        {hoveredNode && (
          <div 
            className="absolute z-50"
            style={{
              left: `${(nodes.find(n => n.id === hoveredNode)?.position.x || 0) + 200}px`,
              top: `${(nodes.find(n => n.id === hoveredNode)?.position.y || 0) + 100}px`
            }}
            onMouseEnter={() => setHoveredNode(hoveredNode)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <button
              onClick={() => openAgentChat(nodes.find(n => n.id === hoveredNode))}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 z-60"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Ask AI</span>
            </button>
          </div>
        )}

        {/* Enhanced Properties Panel */}
        {selectedNode && (
          <div className="absolute top-6 right-6 w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 z-30 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <Cog6ToothIcon className="w-5 h-5 mr-2" />
                  Properties
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Component Name & Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Name
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeProperties(selectedNode.id, { label: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Enter component name"
                />
                
                <div className="flex items-center space-x-3 mt-3">
                  <div className={`w-12 h-12 ${componentLibrary.find(c => c.type === selectedNode.data.serviceType)?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center text-white text-lg`}>
                    {componentLibrary.find(c => c.type === selectedNode.data.serviceType)?.icon || '📦'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{componentLibrary.find(c => c.type === selectedNode.data.serviceType)?.label || 'Component'}</div>
                    <div className="text-sm text-gray-500 capitalize">{selectedNode.data.serviceType}</div>
                  </div>
                </div>
              </div>

              {/* Service Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Description
                </label>
                <textarea
                  value={selectedNode.data.description || ''}
                  onChange={(e) => updateNodeProperties(selectedNode.id, { description: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe what this service does..."
                />
              </div>

              {/* Functional Requirements */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Functional Requirements
                </label>
                <textarea
                  value={selectedNode.data.functionalRequirements || ''}
                  onChange={(e) => updateNodeProperties(selectedNode.id, { functionalRequirements: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="• User authentication&#10;• Data validation&#10;• API endpoints&#10;• Business logic..."
                />
              </div>

              {/* API Specifications */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Specifications
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Request Format</label>
                    <textarea
                      value={selectedNode.data.requestFormat || ''}
                      onChange={(e) => updateNodeProperties(selectedNode.id, { requestFormat: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={3}
                      placeholder='{"userId": "string", "action": "string"}'
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Response Format</label>
                    <textarea
                      value={selectedNode.data.responseFormat || ''}
                      onChange={(e) => updateNodeProperties(selectedNode.id, { responseFormat: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={3}
                      placeholder='{"status": "success", "data": {...}}'
                    />
                  </div>
                </div>
              </div>

              {/* Performance & Scaling Properties */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <BoltIcon className="w-4 h-4 mr-2" />
                  Performance & Scaling
                </h4>
                <div className="space-y-4">
                  {selectedNode.data.properties && Object.entries(selectedNode.data.properties).map(([key, value]) => {
                    const tooltips: Record<string, string> = {
                      rps: 'Requests Per Second - Maximum number of requests this service can handle',
                      instances: 'Number of running instances for load distribution',
                      cpuLimit: 'CPU resource limit (e.g., 1000m = 1 CPU core)',
                      memoryLimit: 'Memory resource limit (e.g., 2Gi = 2 gigabytes)',
                      autoscaling: 'Automatically scale instances based on load',
                      minReplicas: 'Minimum number of instances to keep running',
                      maxReplicas: 'Maximum number of instances during peak load',
                      storage: 'Persistent storage capacity',
                      connections: 'Maximum concurrent database connections',
                      backupEnabled: 'Automatic backup and recovery system',
                      memory: 'Cache memory allocation',
                      eviction: 'Cache eviction policy (LRU, LFU, etc.)',
                      ttl: 'Time To Live - how long data stays in cache (seconds)',
                      throughput: 'Message processing capacity per second',
                      retention: 'How long messages are stored',
                      partitions: 'Number of message queue partitions for parallel processing'
                    };

                    return (
                      <div key={key} className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize flex items-center">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          {tooltips[key] && (
                            <div className="ml-2 relative">
                              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-xs cursor-help">?</div>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                {tooltips[key]}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </label>
                        {typeof value === 'boolean' ? (
                          <button
                            onClick={() => updateNodeProperties(selectedNode.id, { [key]: !value })}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${
                              value ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            {value ? '✅ Enabled' : '❌ Disabled'}
                          </button>
                        ) : (
                          <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={value as string | number}
                            onChange={(e) => updateNodeProperties(selectedNode.id, { 
                              [key]: typeof value === 'number' ? parseInt(e.target.value) : e.target.value 
                            })}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => openAgentChat(selectedNode)}
                  className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  <span>Optimize with AI</span>
                </button>

                <button
                  onClick={() => generateCode(selectedNode)}
                  className="w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <CommandLineIcon className="w-5 h-5" />
                  <span>Generate Code</span>
                </button>

                <button
                  onClick={() => previewComponent(selectedNode)}
                  className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <EyeIcon className="w-5 h-5" />
                  <span>View in Deploy</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Panel - Fixed positioning with proper z-index */}
        {showAgentChat && (
          <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 z-[9999] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-gray-900">🤖 Archie - Your Architecture Buddy</span>
                {agentContext && (
                  <span className="text-sm text-gray-500">• {agentContext.data.label}</span>
                )}
              </div>
              <button
                onClick={() => setShowAgentChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {/* Welcome message */}
                {chatMessages.length === 0 && (
                  <>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        🎯 Hey there! I'm Archie, your architecture buddy! Ready to build something amazing together? 
                        {agentContext && ` I can see you're working on the ${agentContext.data.label} - let's make it epic!`}
                      </p>
                    </div>
                    {agentContext && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">
                          <strong>AI Suggestions for {agentContext.data.label}:</strong>
                        </p>
                        <ul className="mt-2 text-sm text-gray-600 space-y-1">
                          <li>• Consider adding caching layer for better performance</li>
                          <li>• Implement circuit breaker pattern for resilience</li>
                          <li>• Add monitoring and observability</li>
                          <li>• Scale horizontally with load balancers</li>
                        </ul>
                      </div>
                    )}
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>💡 Quick Actions:</strong>
                      </p>
                      <div className="mt-2 space-y-2">
                        <button 
                          onClick={() => setChatInput("🚀 Generate production-ready code")}
                          className="w-full text-left text-sm bg-white rounded px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          🚀 Generate production-ready code
                        </button>
                        <button 
                          onClick={() => setChatInput("📊 Analyze performance bottlenecks")}
                          className="w-full text-left text-sm bg-white rounded px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          📊 Analyze performance bottlenecks
                        </button>
                        <button 
                          onClick={() => setChatInput("🔒 Review security vulnerabilities")}
                          className="w-full text-left text-sm bg-white rounded px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          🔒 Review security vulnerabilities
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Chat messages */}
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Show action buttons for agent messages with actions */}
                      {message.type === 'agent' && (message as any).actions && (message as any).actions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-600 font-medium">🎯 Suggested Actions:</p>
                          <div className="flex flex-wrap gap-2">
                            {(message as any).actions.map((action: any, index: number) => (
                              <button
                                key={index}
                                onClick={() => processAgentActions([action])}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  action.status === 'ready' 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : action.status === 'completed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                                disabled={action.status !== 'ready'}
                              >
                                {action.type === 'ADD_COMPONENT' && '➕ Add Component'}
                                {action.type === 'UPDATE_COMPONENT' && '✏️ Update Component'}
                                {action.type === 'CONNECT_COMPONENTS' && '🔗 Connect Components'}
                                {action.type === 'REMOVE_COMPONENT' && '🗑️ Remove Component'}
                                {action.type === 'OPTIMIZE_LAYOUT' && '📐 Optimize Layout'}
                                {action.type === 'GENERATE_CODE' && '💻 Generate Code'}
                                {action.type === 'SUGGEST_IMPROVEMENTS' && '💡 View Suggestions'}
                                {action.type === 'VALIDATE_ARCHITECTURE' && '✅ Validate Architecture'}
                                {!['ADD_COMPONENT', 'UPDATE_COMPONENT', 'CONNECT_COMPONENTS', 'REMOVE_COMPONENT', 'OPTIMIZE_LAYOUT', 'GENERATE_CODE', 'SUGGEST_IMPROVEMENTS', 'VALIDATE_ARCHITECTURE'].includes(action.type) && action.type}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                                 {/* Typing indicator */}
                 {isAgentTyping && (
                   <div className="flex justify-start">
                     <div className="bg-gray-100 rounded-lg p-3">
                       <div className="flex space-x-1">
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Scroll anchor */}
                 <div ref={chatMessagesEndRef} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Ask me anything about your architecture..."
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isAgentTyping}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isAgentTyping}
                  className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAgentTyping ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collaboration Cursors */}
        {isCollaborating && activeUsers.map((user) => (
          <div
            key={user.id}
            className="absolute pointer-events-none z-30 transition-all duration-300"
            style={{
              left: `${user.cursor.x}px`,
              top: `${user.cursor.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <div className={`w-4 h-4 ${user.color} rounded-full shadow-lg`}></div>
              <div className={`absolute top-4 left-2 ${user.color} text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg`}>
                {user.name}
              </div>
            </div>
          </div>
        ))}

        {/* Quick Add Button */}
        {!showComponentToolbar && (
          <button
            onClick={() => setShowComponentToolbar(true)}
            className="absolute bottom-6 left-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 flex items-center justify-center z-40"
          >
            <PlusIcon className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
}

export default DesignCanvasPage;