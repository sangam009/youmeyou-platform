'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AgentInteractionPanelProps {
  canvasState: any;
  projectId: string;
  onCanvasUpdate: (updates: any) => void;
  onSuggestionApply: (suggestion: any) => void;
}

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  specialty: string;
  currentTask?: string;
  progress?: number;
  avatar: string;
}

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system' | 'clarification' | 'intent' | 'task_breakdown' | 'task_start' | 'task_complete' | 'action' | 'complete' | 'error';
  agentId?: string;
  agentName?: string;
  content: string;
  timestamp: Date;
  metadata?: any;
  suggestions?: Array<{
    id: string;
    text: string;
    action: string;
    confidence: number;
  }>;
  taskId?: string;
  taskTitle?: string;
  intent?: string;
  actions?: any[];
}

interface ContextAwarePrompt {
  userLevel: 'beginner' | 'intermediate' | 'expert';
  projectType: string;
  technologies: string[];
  patterns: string[];
  adaptedMessage: string;
  reasoning: string;
}

interface CollaborationFlow {
  id: string;
  agents: Agent[];
  currentStep: number;
  totalSteps: number;
  sharedContext: any;
  status: 'planning' | 'executing' | 'completed' | 'error';
}

export const AgentInteractionPanel: React.FC<AgentInteractionPanelProps> = ({
  canvasState,
  projectId,
  onCanvasUpdate,
  onSuggestionApply
}) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'agents' | 'collaboration' | 'insights'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents] = useState<Agent[]>([
    {
      id: 'arch-001',
      name: 'Architecture Designer',
      status: 'idle',
      specialty: 'System architecture and patterns',
      avatar: '🏗️'
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
    },
    {
      id: 'sec-001',
      name: 'Security Analyst',
      status: 'idle',
      specialty: 'Security and compliance',
      avatar: '🔒'
    },
    {
      id: 'code-001',
      name: 'Code Generator',
      status: 'idle',
      specialty: 'Code generation and optimization',
      avatar: '💻'
    }
  ]);
  
  const [collaboration, setCollaboration] = useState<CollaborationFlow | null>(null);
  const [localUserProfile, setLocalUserProfile] = useState({
    experienceLevel: 'intermediate' as const,
    preferences: {
      codeStyle: 'modern',
      architecture: 'microservices',
      testing: 'comprehensive'
    }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskProgress, setTaskProgress] = useState<{completed: number, total: number}>({completed: 0, total: 0});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Dynamic prompting with context awareness
  const generateContextAwarePrompt = useCallback(async (userInput: string): Promise<ContextAwarePrompt> => {
    const nodeTypes = canvasState?.nodes?.map((n: any) => n.data?.serviceType).filter(Boolean) || [];
    const technologies = extractTechnologies(canvasState);
    
    return {
      userLevel: localUserProfile.experienceLevel,
      projectType: detectProjectType(nodeTypes),
      technologies,
      patterns: identifyPatterns(canvasState),
      adaptedMessage: adaptPromptForUser(userInput, localUserProfile.experienceLevel),
      reasoning: `Adapted for ${localUserProfile.experienceLevel} user with ${technologies.join(', ')} tech stack`
    };
  }, [canvasState, localUserProfile]);

  // Enhanced message sending with simple chat streaming
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage(null);
    setCurrentTask(null);
    setTaskProgress({completed: 0, total: 0});

    try {
      // Send to simple chat streaming API
      const response = await fetch('/api/simple-chat/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: inputValue,
          canvasId: projectId,
          userId: user?.uid || userProfile?.uid || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Create initial streaming message
      const streamingMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: '',
        timestamp: new Date()
      };

      setStreamingMessage(streamingMsg);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              handleStreamEvent(data, streamingMsg);
            } catch (e) {
              console.warn('Failed to parse event data:', line);
            }
          }
        }
      }

      // Finalize streaming message
      if (streamingMessage) {
        setMessages(prev => [...prev, streamingMessage]);
        setStreamingMessage(null);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingMessage(null);
      setCurrentTask(null);
      setTaskProgress({completed: 0, total: 0});
    }
  };

  // Handle streaming events
  const handleStreamEvent = (data: any, streamingMsg: Message) => {
    switch (data.type) {
      case 'connected':
        // Connection established
        break;

      case 'intent_classified':
        const intentMessage: Message = {
          id: `intent-${Date.now()}`,
          type: 'intent',
          content: data.message,
          timestamp: new Date(),
          intent: data.intent
        };
        setMessages(prev => [...prev, intentMessage]);
        break;

      case 'task_breakdown':
        const breakdownMessage: Message = {
          id: `breakdown-${Date.now()}`,
          type: 'task_breakdown',
          content: `Breaking down into ${data.totalTasks} tasks...`,
          timestamp: new Date(),
          metadata: {
            tasks: data.tasks,
            totalTasks: data.totalTasks,
            executionStrategy: data.executionStrategy
          }
        };
        setMessages(prev => [...prev, breakdownMessage]);
        setTaskProgress({completed: 0, total: data.totalTasks});
        break;

      case 'task_start':
        const taskStartMessage: Message = {
          id: `task-start-${Date.now()}`,
          type: 'task_start',
          content: `Starting: ${data.task.title}`,
          timestamp: new Date(),
          taskId: data.task.id,
          taskTitle: data.task.title
        };
        setMessages(prev => [...prev, taskStartMessage]);
        setCurrentTask(data.task);
        break;

      case 'text':
        // Append text to streaming message
        if (streamingMsg) {
          streamingMsg.content += data.content;
          setStreamingMessage({...streamingMsg});
        }
        break;

      case 'action_executed':
        const actionMessage: Message = {
          id: `action-${Date.now()}`,
          type: 'action',
          content: `Action executed: ${data.action.type}`,
          timestamp: new Date(),
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          actions: [data.action]
        };
        setMessages(prev => [...prev, actionMessage]);
        
        // Apply canvas updates
        if (data.action && data.result?.success) {
          onCanvasUpdate(data.action);
        }
        break;

      case 'task_complete':
        const taskCompleteMessage: Message = {
          id: `task-complete-${Date.now()}`,
          type: 'task_complete',
          content: `Completed: ${data.task.title}`,
          timestamp: new Date(),
          taskId: data.task.id,
          taskTitle: data.task.title
        };
        setMessages(prev => [...prev, taskCompleteMessage]);
        setCurrentTask(null);
        setTaskProgress(prev => ({...prev, completed: prev.completed + 1}));
        break;

      case 'complete':
        const completeMessage: Message = {
          id: `complete-${Date.now()}`,
          type: 'complete',
          content: `Processing complete! ${data.completedTasks}/${data.totalTasks} tasks finished.`,
          timestamp: new Date(),
          metadata: {
            completedTasks: data.completedTasks,
            totalTasks: data.totalTasks,
            canvasState: data.canvasState,
            executionHistory: data.executionHistory
          }
        };
        setMessages(prev => [...prev, completeMessage]);
        break;

      case 'error':
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'error',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        break;
    }
  };

  // Agent collaboration workflow
  const startAgentCollaboration = async (task: string, selectedAgents: string[]) => {
    setIsLoading(true);
    
    const collaborationFlow: CollaborationFlow = {
      id: Date.now().toString(),
      agents: agents.filter(a => selectedAgents.includes(a.id)),
      currentStep: 0,
      totalSteps: selectedAgents.length,
      sharedContext: {
        canvasState,
        userProfile,
        projectId
      },
      status: 'planning'
    };

    setCollaboration(collaborationFlow);

    try {
      const response = await fetch('/api/canvas/dynamic-prompting/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          agents: selectedAgents,
          canvasState,
          projectId,
          userProfile
        })
      });

      const result = await response.json();

      if (result.success) {
        // Add collaboration results to messages
        result.data.collaboration.forEach((collab: any, index: number) => {
          const message: Message = {
            id: `collab-${Date.now()}-${index}`,
            type: 'agent',
            agentId: collab.agentId,
            agentName: collab.agent,
            content: collab.result.content || collab.result.summary || 'Task completed',
            timestamp: new Date(),
            metadata: {
              collaborationType: collab.promptType,
              collaborationStep: index + 1,
              totalSteps: selectedAgents.length
            }
          };
          setMessages(prev => [...prev, message]);
        });

        setCollaboration(prev => prev ? { ...prev, status: 'completed' } : null);
      }
    } catch (error) {
      console.error('Collaboration error:', error);
      setCollaboration(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setIsLoading(false);
    }
  };

  // Request clarification when needed
  const requestClarification = async (missingInfo: string[]) => {
    try {
      const response = await fetch('/api/canvas/dynamic-prompting/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequest: inputValue,
          currentUnderstanding: { canvasState, userProfile },
          context: { projectId, technologies: extractTechnologies(canvasState) }
        })
      });

      const result = await response.json();

      if (result.success) {
        const clarificationMessage: Message = {
          id: Date.now().toString(),
          type: 'clarification',
          content: result.data.clarificationQuestions.content,
          timestamp: new Date(),
          metadata: {
            missingInformation: result.data.missingInformation,
            recommendations: result.data.recommendations
          }
        };

        setMessages(prev => [...prev, clarificationMessage]);
      }
    } catch (error) {
      console.error('Clarification error:', error);
    }
  };

  // Helper functions
  const extractTechnologies = (canvasState: any): string[] => {
    if (!canvasState?.nodes) return [];
    
    const techs = new Set<string>();
    canvasState.nodes.forEach((node: any) => {
      const label = node.data?.label?.toLowerCase() || '';
      if (label.includes('react')) techs.add('React');
      if (label.includes('node')) techs.add('Node.js');
      if (label.includes('postgres')) techs.add('PostgreSQL');
      if (label.includes('mongo')) techs.add('MongoDB');
      if (label.includes('redis')) techs.add('Redis');
    });
    
    return Array.from(techs);
  };

  const detectProjectType = (nodeTypes: string[]): string => {
    if (nodeTypes.includes('frontend') && nodeTypes.includes('backend')) return 'full-stack-web';
    if (nodeTypes.includes('microservice')) return 'microservices';
    return 'web-application';
  };

  const identifyPatterns = (canvasState: any): string[] => {
    if (!canvasState?.nodes) return [];
    
    const patterns = [];
    const hasGateway = canvasState.nodes.some((n: any) => n.data?.serviceType === 'api-gateway');
    const hasLoadBalancer = canvasState.nodes.some((n: any) => n.data?.serviceType === 'load-balancer');
    
    if (hasGateway) patterns.push('api-gateway');
    if (hasLoadBalancer) patterns.push('load-balancing');
    
    return patterns;
  };

  const adaptPromptForUser = (input: string, level: string): string => {
    switch (level) {
      case 'beginner':
        return `Please explain ${input} step-by-step with examples and best practices.`;
      case 'expert':
        return `Provide advanced recommendations for ${input} with trade-offs and optimization strategies.`;
      default:
        return `Help me with ${input} using practical approaches and clear explanations.`;
    }
  };

  const extractSuggestions = (analysisResult: any) => {
    if (!analysisResult?.suggestions) return [];
    
    return analysisResult.suggestions.map((suggestion: any, index: number) => ({
      id: `suggestion-${index}`,
      text: suggestion.text || suggestion,
      action: suggestion.action || 'apply',
      confidence: suggestion.confidence || 0.8
    }));
  };

  const applySuggestion = (suggestion: any) => {
    onSuggestionApply(suggestion);
    
    const confirmMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `Applied suggestion: ${suggestion.text}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header with tabs */}
      <div className="flex border-b border-gray-200">
        {(['chat', 'agents', 'collaboration', 'insights'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.type === 'clarification'
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                        : message.type === 'intent'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : message.type === 'task_breakdown'
                        ? 'bg-blue-50 border border-blue-200 text-blue-800'
                        : message.type === 'task_start'
                        ? 'bg-purple-50 border border-purple-200 text-purple-800'
                        : message.type === 'task_complete'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : message.type === 'action'
                        ? 'bg-orange-50 border border-orange-200 text-orange-800'
                        : message.type === 'complete'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-800'
                        : message.type === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.agentName && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        {agents.find(a => a.id === message.agentId)?.avatar} {message.agentName}
                      </div>
                    )}
                    
                    {/* Task info for task-related messages */}
                    {message.taskTitle && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        📋 {message.taskTitle}
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Intent info */}
                    {message.intent && (
                      <div className="mt-2 text-xs opacity-75 border-t pt-2">
                        🎯 Intent: {message.intent}
                      </div>
                    )}
                    
                    {/* Task breakdown info */}
                    {message.metadata?.tasks && (
                      <div className="mt-2 text-xs opacity-75 border-t pt-2">
                        📋 {message.metadata.totalTasks} tasks planned
                      </div>
                    )}
                    
                    {/* Action info */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 text-xs opacity-75 border-t pt-2">
                        ⚡ Action executed: {message.actions[0].type}
                      </div>
                    )}
                    
                    {/* Context adaptation info */}
                    {message.metadata?.contextAdaptation && (
                      <div className="mt-2 text-xs opacity-75 border-t pt-2">
                        💡 {message.metadata.contextAdaptation.reasoning}
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium">Suggestions:</div>
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => applySuggestion(suggestion)}
                            className="block w-full text-left text-xs bg-white bg-opacity-20 rounded p-2 hover:bg-opacity-30 transition-colors"
                          >
                            ✨ {suggestion.text}
                            <span className="float-right opacity-60">
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                    <div className="whitespace-pre-wrap">{streamingMessage.content}</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">
                        {currentTask ? `Processing: ${currentTask.title}` : 'Processing with AI...'}
                      </span>
                    </div>
                    {taskProgress.total > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{taskProgress.completed}/{taskProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(taskProgress.completed / taskProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about your architecture or just chat..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                <span>🚀 Simple Chat enabled</span>
                <span>👤 Level: {localUserProfile.experienceLevel}</span>
                <span>🎯 Intent-aware processing</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="p-4 space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Available Agents</h3>
              <p className="text-sm text-gray-600">
                Each agent specializes in different aspects of your project
              </p>
            </div>
            
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{agent.avatar}</span>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-600">{agent.specialty}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        agent.status === 'idle' ? 'bg-gray-400' :
                        agent.status === 'working' ? 'bg-yellow-400' :
                        agent.status === 'completed' ? 'bg-green-400' :
                        'bg-red-400'
                      }`}
                    />
                    <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
                  </div>
                </div>
                
                {agent.currentTask && (
                  <div className="mt-2 text-sm text-gray-600">
                    Current task: {agent.currentTask}
                  </div>
                )}
                
                {agent.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(agent.progress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Agent Collaboration</h3>
              <p className="text-sm text-gray-600">
                Coordinate multiple agents to work together on complex tasks
              </p>
            </div>

            {!collaboration && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Description
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Describe what you want the agents to collaborate on..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agents
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {agents.map((agent) => (
                      <label key={agent.id} className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{agent.avatar} {agent.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => startAgentCollaboration('Design e-commerce system', ['arch-001', 'db-001', 'api-001'])}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Start Collaboration
                </button>
              </div>
            )}

            {collaboration && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Collaboration in Progress</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      collaboration.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                      collaboration.status === 'executing' ? 'bg-blue-100 text-blue-800' :
                      collaboration.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {collaboration.status}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Step {collaboration.currentStep + 1} of {collaboration.totalSteps}</span>
                      <span>{Math.round(((collaboration.currentStep + 1) / collaboration.totalSteps) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((collaboration.currentStep + 1) / collaboration.totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {collaboration.agents.map((agent, index) => (
                      <div key={agent.id} className="flex items-center space-x-3">
                        <span className="text-lg">{agent.avatar}</span>
                        <span className="flex-1 text-sm">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          index < collaboration.currentStep ? 'bg-green-400' :
                          index === collaboration.currentStep ? 'bg-yellow-400' :
                          'bg-gray-300'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="p-4 space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Project Insights</h3>
              <p className="text-sm text-gray-600">
                AI-powered insights about your architecture and development process
              </p>
            </div>

            <div className="grid gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600">🧠</span>
                  <h4 className="font-medium text-blue-800">Dynamic Prompting Active</h4>
                </div>
                <p className="text-sm text-blue-700">
                  Your interactions are being optimized based on your experience level and project context.
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">🎯</span>
                  <h4 className="font-medium text-green-800">Context Awareness</h4>
                </div>
                <p className="text-sm text-green-700">
                  Agents understand your {extractTechnologies(canvasState).join(', ')} tech stack and adapt accordingly.
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-purple-600">🤝</span>
                  <h4 className="font-medium text-purple-800">Agent Collaboration</h4>
                </div>
                <p className="text-sm text-purple-700">
                  Multiple agents can work together seamlessly with shared context and coordinated responses.
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-orange-600">🚀</span>
                  <h4 className="font-medium text-orange-800">Performance Optimized</h4>
                </div>
                <p className="text-sm text-orange-700">
                  Token optimization and intelligent caching ensure fast, cost-effective responses.
                </p>
              </div>
            </div>

            {/* User Profile Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">User Profile Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={localUserProfile.experienceLevel}
                    onChange={(e) => setLocalUserProfile(prev => ({
                      ...prev,
                      experienceLevel: e.target.value as any
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Architecture
                  </label>
                  <select
                    value={localUserProfile.preferences.architecture}
                    onChange={(e) => setLocalUserProfile(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, architecture: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="microservices">Microservices</option>
                    <option value="monolithic">Monolithic</option>
                    <option value="serverless">Serverless</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentInteractionPanel; 