import { A2AStreamingService } from './a2aStreaming';

// Export a singleton instance of the streaming service
export const streamingService = new A2AStreamingService();

// Types for streaming data
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