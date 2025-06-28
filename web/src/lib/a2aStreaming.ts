import { A2AClient, TaskStatusUpdateEvent, TaskArtifactUpdateEvent, TaskStatus, Part, TextPart } from "@a2a-js/sdk";
import { config } from '../config';

export interface StreamingOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
  onCanvasUpdate?: (canvasData: any) => void;
  onCodeUpdate?: (codeData: any) => void;
}

export class A2AStreamingService {
  private a2aClient: A2AClient;

  constructor() {
    // Initialize with proper base URL
    this.a2aClient = new A2AClient(config.api.designService);
  }

  async startStreamingExecution(task: any, options: StreamingOptions = {}) {
    try {
      // First check if the agent card is available
      try {
        await this.a2aClient.getAgentCard();
      } catch (error) {
        console.error('Failed to fetch agent card:', error);
        throw new Error('Design service is not available. Please ensure the service is running.');
      }

      const stream = await this.a2aClient.sendMessageStream({
        message: {
          messageId: task.id || Date.now().toString(),
          role: "user",
          parts: [{ kind: "text", text: task.prompt } as TextPart],
          kind: "message"
        }
      });

      // Process streaming responses
      for await (const event of stream) {
        if (event.kind === 'status-update') {
          const statusEvent = event as TaskStatusUpdateEvent;
          const status = statusEvent.status as TaskStatus & { progress?: number; result?: any };
          
          // Handle progress updates
          if (status.progress && options.onProgress) {
            options.onProgress(status.progress);
          }

          // Handle completion
          if (status.state === 'completed' && options.onComplete) {
            options.onComplete(status.result);
          }

        } else if (event.kind === 'artifact-update') {
          const artifactEvent = event as TaskArtifactUpdateEvent;
          
          // Handle canvas updates
          if (artifactEvent.artifact.name?.includes('canvas') && options.onCanvasUpdate) {
            options.onCanvasUpdate(this.parseCanvasArtifact(artifactEvent.artifact));
          }
          
          // Handle code updates
          if ((artifactEvent.artifact.name?.includes('.js') || 
               artifactEvent.artifact.name?.includes('.ts')) && 
              options.onCodeUpdate) {
            const part = artifactEvent.artifact.parts[0] as TextPart;
            options.onCodeUpdate({
              filename: artifactEvent.artifact.name,
              content: part?.text
            });
          }
        }
      }
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  private parseCanvasArtifact(artifact: any) {
    try {
      const part = artifact.parts[0] as TextPart;
      const canvasData = JSON.parse(part?.text || '{}');
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