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
    this.baseUrl = config.api.designService;
  }

  async startStreamingExecution(task: any, options: StreamingOptions = {}) {
    try {
      console.log('🔄 Starting streaming execution:', task);
      
      // Create EventSource for server-sent events
      const eventSource = new EventSource(`${this.baseUrl}/agents/ask`, {
        withCredentials: true
      });

      // Handle connection established
      eventSource.addEventListener('connected', (event) => {
        console.log('📡 Streaming connection established');
        
        // Send task data
        fetch(`${this.baseUrl}/agents/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: task.prompt,
            type: task.type || 'general',
            canvasState: { projectId: task.canvasId },
            architecture: task.architecture
          })
        }).catch(error => {
          console.error('❌ Error sending task data:', error);
          if (options.onError) {
            options.onError(error);
          }
          eventSource.close();
        });
      });

      // Handle streaming messages
      eventSource.addEventListener('message', (event) => {
        try {
          console.log('📡 Received stream event:', event.data);
          const data = JSON.parse(event.data);
          this.processStreamChunk(data, options);
        } catch (error) {
          console.warn('⚠️ Error processing stream chunk:', error);
        }
      });

      // Handle completion
      eventSource.addEventListener('complete', (event) => {
        try {
          console.log('✅ Stream completed:', event.data);
          const data = JSON.parse(event.data);
          if (options.onComplete) {
            options.onComplete(data.result);
          }
        } catch (error) {
          console.warn('⚠️ Error processing completion:', error);
        } finally {
          eventSource.close();
        }
      });

      // Handle errors
      eventSource.addEventListener('error', (event) => {
        console.error('❌ Stream error:', event);
        if (options.onError) {
          options.onError(event);
        }
        eventSource.close();
      });

      // Clean up on unmount
      return () => {
        console.log('🧹 Cleaning up streaming connection');
        eventSource.close();
      };

    } catch (error) {
      console.error('❌ Streaming execution error:', error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  private processStreamChunk(data: any, options: StreamingOptions) {
    try {
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