'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  SparklesIcon, 
  PaperAirplaneIcon, 
  UserIcon,
  CpuChipIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { askAgent, getAgentStatus } from '@/lib/canvasApi';

interface AgentPanelProps {
  canvasState: {
    nodes: Node[];
    edges: Edge[];
  };
  onSuggestion: (suggestion: any) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  agentId?: string;
  agentName?: string;
  content: string;
  timestamp: Date;
  suggestions?: any[];
}

const availableAgents = [
  {
    id: 'arch-001',
    name: 'Architecture Designer',
    specialty: 'System Architecture',
    icon: '🏗️',
    color: 'text-blue-600',
    status: 'active'
  },
  {
    id: 'db-001',
    name: 'Database Designer',
    specialty: 'Data Modeling',
    icon: '🗄️',
    color: 'text-green-600',
    status: 'active'
  },
  {
    id: 'api-001',
    name: 'API Designer',
    specialty: 'API Design',
    icon: '🔌',
    color: 'text-yellow-600',
    status: 'active'
  },
  {
    id: 'sec-001',
    name: 'Security Architect',
    specialty: 'Security & Auth',
    icon: '🔒',
    color: 'text-red-600',
    status: 'active'
  }
];

export default function AgentPanel({ canvasState, onSuggestion }: AgentPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'agent',
        agentId: 'arch-001',
        agentName: 'Architecture Designer',
        content: "👋 Hi! I'm your Architecture Designer. I can help you design system architectures, suggest improvements, and identify potential issues. What would you like to build?",
        timestamp: new Date(),
        suggestions: [
          "Design a microservices architecture",
          "Review my current design",
          "Suggest security improvements",
          "Add a caching layer"
        ]
      }]);
    }
  }, [messages.length]);

  const getContextualPrompt = () => {
    const nodeTypes = canvasState.nodes.map(n => n.data?.serviceType).filter(Boolean);
    const nodeCount = canvasState.nodes.length;
    const connectionCount = canvasState.edges.length;
    
    return `
Current canvas state:
- ${nodeCount} components: ${nodeTypes.join(', ')}
- ${connectionCount} connections
- Architecture pattern: ${nodeTypes.includes('microservice') ? 'Microservices' : 'Monolithic'}

User's question: ${input}

Please provide specific, actionable advice for this architecture.
    `.trim();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate A2A agent routing based on content
      let selectedAgent = availableAgents[0]; // Default to architecture agent
      
      if (input.toLowerCase().includes('database') || input.toLowerCase().includes('data')) {
        selectedAgent = availableAgents[1]; // Database agent
      } else if (input.toLowerCase().includes('api') || input.toLowerCase().includes('endpoint')) {
        selectedAgent = availableAgents[2]; // API agent
      } else if (input.toLowerCase().includes('security') || input.toLowerCase().includes('auth')) {
        selectedAgent = availableAgents[3]; // Security agent
      }

      setActiveAgent(selectedAgent.id);

      // Use real AI agent API
      const apiResponse = await askAgent({
        content: input,
        canvasState: canvasState,
        agentId: selectedAgent.id
      });
      
      const response = apiResponse.data.response;
      
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, agentMessage]);
      
      if (response.suggestions) {
        onSuggestion(response.suggestions);
      }
      
    } catch (error) {
      console.error('Agent communication error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        agentId: 'system',
        agentName: 'System',
        content: "I'm having trouble connecting to the AI agents. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">AI Agents</h3>
        </div>
        
        {/* Active Agents */}
        <div className="flex items-center space-x-2 mt-2">
          {availableAgents.map((agent) => (
            <div
              key={agent.id}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                activeAgent === agent.id 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span>{agent.icon}</span>
              <span className="hidden sm:inline">{agent.name.split(' ')[0]}</span>
              {agent.status === 'active' && (
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'agent' && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <CpuChipIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-500">{message.agentName}</span>
                </div>
              )}
              
              <div className={`p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <LightBulbIcon className="w-3 h-3" />
                      <span>Suggestions:</span>
                    </div>
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center order-1 mr-2">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <CpuChipIcon className="w-4 h-4 text-blue-600 animate-pulse" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your architecture..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simulate agent response (replace with actual A2A + Gemini integration)
async function simulateAgentResponse(agent: any, prompt: string) {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const responses = {
    'arch-001': {
      content: "I've analyzed your current architecture. Here are my recommendations:\n\n• Consider adding a load balancer for better traffic distribution\n• Implement API Gateway for centralized routing\n• Add monitoring and logging services\n• Consider using containerization for better scalability",
      suggestions: [
        "Add load balancer",
        "Implement API Gateway", 
        "Add monitoring service",
        "Review scalability patterns"
      ]
    },
    'db-001': {
      content: "For your database design, I recommend:\n\n• Use separate databases for each microservice\n• Implement read replicas for better performance\n• Consider using Redis for caching frequently accessed data\n• Plan for data consistency across services",
      suggestions: [
        "Add database per service",
        "Add Redis cache",
        "Review data relationships",
        "Plan backup strategy"
      ]
    },
    'api-001': {
      content: "Your API design could benefit from:\n\n• Implementing RESTful conventions\n• Adding rate limiting and throttling\n• Using API versioning strategy\n• Implementing proper error handling",
      suggestions: [
        "Add rate limiting",
        "Implement API versioning",
        "Add error handling",
        "Design API documentation"
      ]
    },
    'sec-001': {
      content: "Security recommendations for your architecture:\n\n• Implement OAuth 2.0 / JWT authentication\n• Use HTTPS everywhere with proper certificates\n• Add input validation and sanitization\n• Implement proper logging and monitoring for security events",
      suggestions: [
        "Add authentication service",
        "Implement HTTPS",
        "Add security monitoring",
        "Review access controls"
      ]
    }
  };
  
  return responses[agent.id as keyof typeof responses] || responses['arch-001'];
} 