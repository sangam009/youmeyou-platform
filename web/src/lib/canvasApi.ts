import axios from 'axios';
import { A2AStreamingService } from './a2aStreaming';
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

// Initialize A2A streaming service
export const streamingService = new A2AStreamingService();

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

// Agent functions
export const askAgent = (request: AgentRequest): EventSource => {
  try {
    console.log('🤖 Starting streaming agent request:', request);
    
    // Validate request parameters
    if (!request.content) {
      throw new Error('Content is required for agent request');
    }

    // Create query parameters
    const params = new URLSearchParams();
    params.append('data', JSON.stringify(request));

    // Create EventSource for streaming
    const eventSource = new EventSource(
      `${getBaseUrl()}${getEndpoint('/agents/ask')}?${params.toString()}`,
      { withCredentials: true }
    );

    console.log('📡 Established streaming connection to:', eventSource.url);
    return eventSource;

  } catch (error) {
    console.error('❌ Error setting up agent streaming:', error);
    throw error;
  }
};

export const getAgentStatus = async () => {
  try {
    const response = await api.get(getEndpoint('/agents/status'));
    return response.data;
  } catch (error) {
    console.error('Error getting agent status:', error);
    throw error;
  }
};

export const chatWithAgent = async (message: string, canvasState?: any, component?: any) => {
  try {
    const response = await api.post(getEndpoint('/agents/chat'), {
      message,
      canvasState,
      component
    });
    return response.data;
  } catch (error) {
    console.error('Error chatting with agent:', error);
    throw error;
  }
};

// Replace WebSocket streaming with A2A SDK streaming
export const startStreamingExecution = (executionId: string, options: StreamingOptions = {}) => {
  return streamingService.startStreamingExecution({
    id: executionId,
    prompt: 'Execute streaming task',
    type: 'EXECUTION'
  }, options);
};

export const startArchitectureDesign = (canvasId: string, requirements: string, options: StreamingOptions = {}) => {
  return streamingService.startArchitectureDesign(canvasId, requirements, options);
};

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

export default canvasApi; 