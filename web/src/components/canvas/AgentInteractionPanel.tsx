'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { A2AStreamingService } from '@/lib/a2aStreaming';

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
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [taskProgress, setTaskProgress] = useState<{completed: number, total: number}>({completed: 0, total: 0});
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localUserProfile, setLocalUserProfile] = useState({
    experienceLevel: 'intermediate' as const,
    preferences: {
      codeStyle: 'modern',
      architecture: 'microservices',
      testing: 'comprehensive'
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
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
      const streamingService = new A2AStreamingService();
      const cleanup = await streamingService.startSimpleChatStreaming(
        inputValue,
        projectId,
        user?.uid || userProfile?.uid || 'anonymous',
        {
          onMessage: (data: any) => {
            if (data.type === 'text') {
              setStreamingMessage((prev) => prev ? { ...prev, content: prev.content + (data.content || '') } : null);
            } else if (data.type === 'action_executed') {
              if (data.action && data.result?.success) {
                onCanvasUpdate(data.action);
              }
            } else if (data.type === 'task_start') {
              setCurrentTask(data.task);
            } else if (data.type === 'task_complete') {
              setCurrentTask(null);
              setTaskProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
            } else if (data.type === 'task_breakdown') {
              setTaskProgress({ completed: 0, total: data.totalTasks });
            } else if (data.type === 'intent_classified') {
              setMessages((prev) => [...prev, {
                id: `intent-${Date.now()}`,
                type: 'intent',
                content: data.message,
                timestamp: new Date(),
                intent: data.intent
              }]);
            } else if (data.type === 'complete') {
              setMessages((prev) => [...prev, {
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
              }]);
            } else if (data.type === 'error') {
              setMessages((prev) => [...prev, {
                id: `error-${Date.now()}`,
                type: 'error',
                content: data.message,
                timestamp: new Date()
              }]);
            }
          },
          onError: (error: any) => {
            setMessages((prev) => [...prev, {
              id: `error-${Date.now()}`,
              type: 'error',
              content: error.message || 'Streaming error',
              timestamp: new Date()
            }]);
            setIsLoading(false);
            setStreamingMessage(null);
            setCurrentTask(null);
            setTaskProgress({ completed: 0, total: 0 });
          },
          onComplete: (result: any) => {
            if (streamingMessage) {
              setMessages((prev) => [...prev, streamingMessage]);
              setStreamingMessage(null);
            }
            setIsLoading(false);
            setCurrentTask(null);
            setTaskProgress({ completed: 0, total: 0 });
          }
        }
      );
      streamCleanupRef.current = cleanup;
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }]);
      setIsLoading(false);
      setStreamingMessage(null);
      setCurrentTask(null);
      setTaskProgress({ completed: 0, total: 0 });
    }
  };

  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, []);

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
                        {/* Agents are not directly managed here, so this will be empty */}
                        {/* This part of the UI needs to be updated to reflect the new agent collaboration */}
                        {/* For now, it will show the agent name if it were a direct agent message */}
                        {/* This will be fixed when the agent collaboration UI is implemented */}
                        {/* {agents.find(a => a.id === message.agentId)?.avatar} {message.agentName} */}
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
                            onClick={() => onSuggestionApply(suggestion)}
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
            
            {/* Agents are not directly managed here, this section needs to be updated */}
            {/* For now, it will show a placeholder message */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Agent collaboration functionality is under development.
                Please select agents from the collaboration tab.
              </p>
            </div>
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

            {/* Agent collaboration UI will go here */}
            {/* For now, it will show a placeholder message */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Agent collaboration functionality is under development.
                Please select agents and describe the task.
              </p>
            </div>
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
                  Agents understand your {/* extractTechnologies(canvasState).join(', ') */} tech stack and adapt accordingly.
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