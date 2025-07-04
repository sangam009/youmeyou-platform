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
      
      // Use streaming API with ndjson format
      const response = await fetch(`${this.baseUrl}/agents/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: task.prompt,
          type: task.type || 'general',
          canvasState: { projectId: task.canvasId },
          architecture: task.architecture
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Create a stream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining data in buffer
          if (buffer) {
            this.processStreamChunk(buffer, options);
          }
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        // Process each complete line
        for (const line of lines) {
          if (line.trim()) {
            this.processStreamChunk(line, options);
          }
        }
      }

      // Signal completion
      if (options.onComplete) {
        options.onComplete({ status: 'completed' });
      }

    } catch (error) {
      console.error('❌ Streaming execution error:', error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  private processStreamChunk(chunk: string, options: StreamingOptions) {
    try {
      const data = JSON.parse(chunk);
      
      // Handle progress updates
      if (data.type === 'progress' && options.onProgress) {
        options.onProgress(data.progress);
      }
      
      // Handle canvas updates
      if (data.type === 'canvas-update' && options.onCanvasUpdate) {
        options.onCanvasUpdate(this.parseCanvasArtifact(data.data));
      }
      
      // Handle code updates
      if (data.type === 'code-update' && options.onCodeUpdate) {
        options.onCodeUpdate(data.data);
      }

      // Log streaming updates for debugging
      console.log('📡 Streaming update:', data.type, data);

    } catch (error) {
      console.warn('⚠️ Error processing stream chunk:', error);
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