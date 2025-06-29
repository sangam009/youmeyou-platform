import axios from 'axios';
import { A2AStreamingService } from './a2aStreaming';

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

// Helper function to get the correct endpoint path
const getEndpoint = (path: string) => {
  if (typeof window === 'undefined') return path;
  
  const hostname = window.location.hostname;
  if (hostname.includes('localhost')) {
    return path; // Direct service access in local dev
  }
  return `/api/design${path}`; // Through nginx proxy in production/staging
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

interface StreamingOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
  onCanvasUpdate?: (canvasData: any) => void;
  onCodeUpdate?: (codeData: any) => void;
}

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

interface AgentRequest {
  content: string;
  canvasState?: any;
  agentId?: string;
  component?: any;
}

// Initialize A2A streaming service
const streamingService = new A2AStreamingService();

// Agent functions
export const askAgent = async (request: AgentRequest) => {
  try {
    console.log('🤖 Sending request to agent:', request);
    const response = await api.post(getEndpoint('/agents/ask'), request);
    console.log('✅ Agent response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error asking agent:', error);
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

const canvasApi = {
  // Get canvas by ID
  async getCanvas(canvasId: string) {
    const response = await api.get(getEndpoint(`/canvas/${canvasId}`));
    return response.data;
  },

  // Create new canvas
  async createCanvas(projectId: string, data: any) {
    const response = await api.post(getEndpoint('/canvas'), {
      projectId,
      ...data
    });
    return response.data;
  },

  // Update canvas
  async updateCanvas(canvasId: string, data: any) {
    const response = await api.put(getEndpoint(`/canvas/${canvasId}`), data);
    return response.data;
  },

  // Delete canvas
  async deleteCanvas(canvasId: string) {
    const response = await api.delete(getEndpoint(`/canvas/${canvasId}`));
    return response.data;
  },

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
      type: 'STREAMING_SESSION',
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

export default canvasApi; 