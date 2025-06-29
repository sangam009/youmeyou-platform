import { config } from '../config';

export interface StreamingOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
  onCanvasUpdate?: (canvasData: any) => void;
  onCodeUpdate?: (codeData: any) => void;
}

export class A2AStreamingService {
  private baseUrl: string;

  constructor() {
    // Use HTTP-based streaming instead of A2A SDK to avoid server-side dependencies
    this.baseUrl = config.api.designService;
  }

  async startStreamingExecution(task: any, options: StreamingOptions = {}) {
    try {
      console.log('🔄 Starting streaming execution:', task);
      
      // For now, use regular HTTP API instead of streaming
      // This avoids the server-side dependency issues
      const response = await fetch(`${this.baseUrl}/agents/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: task.prompt,
          type: task.type || 'general',
          canvasId: task.canvasId,
          architecture: task.architecture
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Simulate progress for now
      if (options.onProgress) {
        options.onProgress(0.5);
      }
      
      // Complete the task
      if (options.onComplete) {
        options.onComplete(result);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Streaming execution error:', error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  private parseCanvasArtifact(artifact: any) {
    try {
      const canvasData = typeof artifact === 'string' ? JSON.parse(artifact) : artifact;
      return {
        nodes: canvasData.nodes || [],
        edges: canvasData.edges || [],
        metadata: canvasData.metadata || {}
      };
    } catch (error) {
      console.error('Error parsing canvas artifact:', error);
      return { nodes: [], edges: [], metadata: {} };
    }
  }

  // Helper method to start architecture design streaming
  async startArchitectureDesign(canvasId: string, requirements: string, options: StreamingOptions = {}) {
    return this.startStreamingExecution({
      id: `arch-${canvasId}`,
      prompt: `Design architecture for: ${requirements}`,
      type: 'ARCHITECTURE_DESIGN',
      canvasId
    }, options);
  }

  // Helper method to start code generation streaming
  async startCodeGeneration(canvasId: string, architecture: any, options: StreamingOptions = {}) {
    return this.startStreamingExecution({
      id: `code-${canvasId}`,
      prompt: `Generate code based on architecture`,
      type: 'CODE_GENERATION',
      canvasId,
      architecture
    }, options);
  }
} 