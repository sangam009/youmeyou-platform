import axios from 'axios';
import { config } from '../config';

// Determine the base URL based on the current hostname
const getBaseUrl = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL || 'https://youmeyou.ai';
  
  const hostname = window.location.hostname;
  if (hostname.includes('staging')) {
    return 'https://staging.youmeyou.ai';
  }
  if (hostname.includes('localhost')) {
    return 'http://localhost:4000'; // Direct design service for local dev
  }
  return 'https://youmeyou.ai';
};

// Get API endpoint path
const getEndpoint = (path: string) => `/api/design${path}`;

// Create API instance
const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true
});

// Simple chat streaming service
export class SimpleChatStreamingService {
  async startStreamingExecution(task: any) {
    // This is now handled by the simple chat API
    console.warn('startStreamingExecution is deprecated, use simple chat API instead');
    return null;
  }

  async startArchitectureDesign(clientId: string, prompt: string) {
    // This is now handled by the simple chat API
    console.warn('startArchitectureDesign is deprecated, use simple chat API instead');
    return null;
  }

  async startSimpleChatStreaming(prompt: string, projectId: string, userId: string, options: any) {
    const response = await fetch('/api/simple-chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        canvasId: projectId,
        userId
      })
    });

    if (!response.body) throw new Error('No response body');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'message' && options.onMessage) {
                options.onMessage(data);
              } else if (data.type === 'error' && options.onError) {
                options.onError(data);
              } else if (data.type === 'complete' && options.onComplete) {
                options.onComplete(data);
              } else if (data.type === 'progress' && options.onProgress) {
                options.onProgress(data.progress || 0);
              } else if (data.type === 'action' && options.onCanvasUpdate) {
                options.onCanvasUpdate(data);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    };

    processStream();

    // Return cleanup function
    return () => {
      reader.cancel();
    };
  }
}

export const streamingService = new SimpleChatStreamingService();

// Types
export interface AgentRequest {
  content: string;
  canvasState?: {
    nodes: any[];
    edges: any[];
  };
  component?: any;
}

export interface StreamingOptions {
  onMessage?: (data: any) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
  onProgress?: (progress: number) => void;
  onCanvasUpdate?: (canvasData: any) => void;
}

export interface StreamingData {
  content?: string;
  actions?: Array<{
    type: string;
    status: 'ready' | 'completed' | 'failed';
    data?: any;
  }>;
  progress?: number;
  type?: string;
}

export interface StreamingResult {
  actions?: Array<{
    type: string;
    status: 'ready' | 'completed' | 'failed';
    data?: any;
  }>;
  content?: string;
  metadata?: Record<string, any>;
}

export interface CanvasData {
  nodes?: Array<any>;
  edges?: Array<any>;
  metadata?: Record<string, any>;
}

// API functions
export const canvasApi = {
  // Get project canvases
  async getProjectCanvases(projectId: string) {
    const response = await api.get(getEndpoint(`/canvas/project/${projectId}`));
    return response.data;
  },

  // Start streaming session using A2A SDK
  async startStreaming(task: string, clientId: string, projectId: string) {
    return streamingService.startStreamingExecution({
      id: `${projectId}-${clientId}`,
      prompt: task,
      projectId,
      clientId
    });
  },

  // Start architecture design using A2A SDK
  startArchitectureDesign: async (request: ArchitectureRequest) => {
    try {
      return streamingService.startArchitectureDesign(
        request.clientId, 
        `Design architecture for ${request.projectType}: ${JSON.stringify(request.requirements)}`
      );
    } catch (error) {
      console.error('Error starting architecture design:', error);
      throw error;
    }
  },

  // Get architecture by canvas ID
  getArchitecture: async (canvasId: string): Promise<ArchitectureData | null> => {
    try {
      const response = await api.get(getEndpoint(`/canvas/architecture/${canvasId}`));
      return response.data;
    } catch (error) {
      console.error('Error getting architecture:', error);
      throw error;
    }
  },

  // Update architecture
  updateArchitecture: async (canvasId: string, architectureData: Partial<ArchitectureData>) => {
    try {
      const response = await api.put(getEndpoint(`/canvas/architecture/${canvasId}`), architectureData);
      return response.data;
    } catch (error) {
      console.error('Error updating architecture:', error);
      throw error;
    }
  }
};

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

interface ArchitectureRequest {
  projectType: string;
  requirements: Record<string, any>;
  constraints?: Record<string, any>;
  existingComponents?: Array<any>;
  scalabilityNeeds?: Record<string, any>;
  clientId: string;
}

// Get canvas by ID
async function getCanvas(canvasId: string) {
  const response = await api.get(getEndpoint(`/canvas/${canvasId}`));
  return response.data;
}

// Create new canvas
async function createCanvas(projectId: string, data: any) {
  const response = await api.post(getEndpoint('/canvas'), {
    projectId,
    ...data
  });
  return response.data;
}

// Update canvas
async function updateCanvas(canvasId: string, data: any) {
  const response = await api.put(getEndpoint(`/canvas/${canvasId}`), data);
  return response.data;
}

// Delete canvas
async function deleteCanvas(canvasId: string) {
  const response = await api.delete(getEndpoint(`/canvas/${canvasId}`));
  return response.data;
}

// Legacy askAgent function - now uses simple chat API
export async function askAgent(request: AgentRequest) {
  try {
    const response = await fetch('/api/simple-chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.content,
        canvasId: 'legacy-agent',
        userId: 'legacy-user'
      })
    });

    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let suggestions: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'message' && data.content) {
              fullContent += data.content;
            } else if (data.type === 'action' && data.action === 'suggestions') {
              suggestions = data.data || [];
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }

    return {
      data: {
        response: {
          content: fullContent,
          suggestions: suggestions
        }
      }
    };
  } catch (error) {
    console.error('Error in askAgent:', error);
    throw error;
  }
}

// Legacy getAgentStatus function
export async function getAgentStatus() {
  // For now, return a mock status since we're using the simple chat API
  return {
    agents: [
      { id: 'arch-001', name: 'Architecture Designer', status: 'active' },
      { id: 'db-001', name: 'Database Designer', status: 'active' },
      { id: 'api-001', name: 'API Designer', status: 'active' },
      { id: 'sec-001', name: 'Security Analyst', status: 'active' }
    ]
  };
}

export default canvasApi; 