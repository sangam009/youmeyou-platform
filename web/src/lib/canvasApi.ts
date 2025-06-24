import axios from 'axios';
import { config } from '../config';

const API_BASE_URL = config.api.designService;

const canvasApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Canvas CRUD operations
export const createCanvas = async (canvasData: {
  projectId: number;
  name: string;
  canvasData: any;
}) => {
  const response = await canvasApi.post('/canvas', canvasData);
  return response.data;
};

export const getCanvas = async (canvasId: string) => {
  const response = await canvasApi.get(`/canvas/${canvasId}`);
  return response.data;
};

export const updateCanvas = async (canvasId: string, updates: {
  name?: string;
  canvasData?: any;
}) => {
  const response = await canvasApi.put(`/canvas/${canvasId}`, updates);
  return response.data;
};

export const deleteCanvas = async (canvasId: string) => {
  const response = await canvasApi.delete(`/canvas/${canvasId}`);
  return response.data;
};

// Canvas utility operations
export const duplicateCanvas = async (canvasId: string, name: string) => {
  const response = await canvasApi.post(`/canvas/${canvasId}/duplicate`, { name });
  return response.data;
};

export const getCanvasVersions = async (canvasId: string) => {
  const response = await canvasApi.get(`/canvas/${canvasId}/versions`);
  return response.data;
};

export const exportCanvas = async (canvasId: string, format: string = 'json') => {
  const response = await canvasApi.get(`/canvas/${canvasId}/export?format=${format}`);
  return response.data;
};

// Project-related operations
export const getProjectCanvases = async (projectId: number) => {
  const response = await canvasApi.get(`/canvas/project/${projectId}`);
  return response.data;
};

// AI Agent operations
export const askAgent = async (data: {
  content: string;
  canvasState?: any;
  agentId?: string;
}) => {
  const response = await canvasApi.post('/agents/ask', data);
  return response.data;
};

export const analyzeCanvas = async (canvasData: any) => {
  const response = await canvasApi.post('/agents/analyze', { canvasData });
  return response.data;
};

export const suggestImprovements = async (canvasData: any, focusArea?: string) => {
  const response = await canvasApi.post('/agents/suggest', { 
    canvasData, 
    focusArea 
  });
  return response.data;
};

export const validateArchitecture = async (canvasData: any, validationType?: string) => {
  const response = await canvasApi.post('/agents/validate', { 
    canvasData, 
    validationType 
  });
  return response.data;
};

export const generateDocumentation = async (canvasData: any, documentationType?: string) => {
  const response = await canvasApi.post('/agents/document', { 
    canvasData, 
    documentationType 
  });
  return response.data;
};

export const collaborateAgents = async (data: {
  content: string;
  canvasState?: any;
  agentIds: string[];
}) => {
  const response = await canvasApi.post('/agents/collaborate', data);
  return response.data;
};

export const getAgentStatus = async () => {
  const response = await canvasApi.get('/agents/status');
  return response.data;
};

export const getAgentCapabilities = async (agentId?: string) => {
  const url = agentId ? `/agents/capabilities/${agentId}` : '/agents/capabilities';
  const response = await canvasApi.get(url);
  return response.data;
};

export const getAgentHealth = async () => {
  const response = await canvasApi.get('/agents/health');
  return response.data;
};

// Error handling interceptor
canvasApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Canvas API Error:', error);
    
    if (error.response?.status === 401) {
      // Handle authentication error
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default canvasApi; 