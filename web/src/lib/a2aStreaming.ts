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

      // Handle all possible event types
      const eventTypes = [
        'connected',
        'message',
        'agent_start',
        'agent_complete',
        'task_analysis',
        'task_division',
        'subtask_start',
        'subtask_complete',
        'routing',
        'follow_up',
        'error',
        'complete'
      ];

      // Set up listeners for all event types
      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            console.log(`📡 Received ${eventType} event:`, event.data);
            const data = JSON.parse(event.data);
            
            switch (eventType) {
              case 'connected':
                // Send task data after connection
                this.sendTaskData(task, options, eventSource);
                break;
              
              case 'error':
                console.error('❌ Stream error:', data);
                if (options.onError) {
                  options.onError(data);
                }
                eventSource.close();
                break;
              
              case 'complete':
                console.log('✅ Stream completed:', data);
                if (options.onComplete) {
                  options.onComplete(data.result);
                }
                eventSource.close();
                break;
              
              default:
                // Process all other events
                this.processStreamChunk(data, options);
            }
          } catch (error) {
            console.warn(`⚠️ Error processing ${eventType} event:`, error);
          }
        });
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

  private async sendTaskData(task: any, options: StreamingOptions, eventSource: EventSource) {
    try {
      await fetch(`${this.baseUrl}/agents/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: task.prompt,
          type: task.type || 'general',
          canvasState: { projectId: task.canvasId },
          architecture: task.architecture,
          streamingEnabled: true
        })
      });
    } catch (error) {
      console.error('❌ Error sending task data:', error);
      if (options.onError) {
        options.onError(error);
      }
      eventSource.close();
    }
  }

  private processStreamChunk(data: any, options: StreamingOptions) {
    try {
      switch (data.type) {
        case 'progress':
          if (options.onProgress) {
            options.onProgress(data.progress);
          }
          break;

        case 'canvas-update':
          if (options.onCanvasUpdate) {
            options.onCanvasUpdate(this.parseCanvasArtifact(data.data));
          }
          break;

        case 'code-update':
          if (options.onCodeUpdate) {
            options.onCodeUpdate(data.data);
          }
          break;

        case 'agent_start':
        case 'agent_complete':
        case 'task_analysis':
        case 'task_division':
        case 'subtask_start':
        case 'subtask_complete':
        case 'routing':
        case 'follow_up':
          // Update progress based on completion scores
          if (options.onProgress && data.completionScore !== undefined) {
            options.onProgress(data.completionScore);
          }
          break;
      }

      // Log all streaming updates for debugging
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