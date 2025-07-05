import { config } from '../config';
import logger from './logger';

export interface StreamingOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
  onCanvasUpdate?: (canvasData: any) => void;
  onCodeUpdate?: (codeData: any) => void;
  onMessage?: (data: any) => void;
}

interface StreamStats {
  messagesReceived: number;
  bytesReceived: number;
  startTime: number;
  lastMessageTime: number;
}

export class A2AStreamingService {
  private baseUrl: string;
  private static stats: StreamStats = {
    messagesReceived: 0,
    bytesReceived: 0,
    startTime: 0,
    lastMessageTime: 0
  };

  constructor() {
    this.baseUrl = config.api.designService;
  }

  static resetStats() {
    this.stats = {
      messagesReceived: 0,
      bytesReceived: 0,
      startTime: Date.now(),
      lastMessageTime: Date.now()
    };
  }

  static logStats() {
    const duration = Date.now() - this.stats.startTime;
    logger.info('📊 A2A Streaming Stats:', {
      messagesReceived: this.stats.messagesReceived,
      bytesReceived: this.stats.bytesReceived,
      durationMs: duration,
      avgMessageSize: this.stats.bytesReceived / (this.stats.messagesReceived || 1),
      messagesPerSecond: (this.stats.messagesReceived / duration) * 1000
    });
  }

  static setupEventSource(url: string, options: StreamingOptions = {}): EventSource {
    this.resetStats();
    
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        // Update stats
        this.stats.messagesReceived++;
        this.stats.bytesReceived += event.data.length;
        this.stats.lastMessageTime = Date.now();

        // Log every 10th message for performance
        if (this.stats.messagesReceived % 10 === 0) {
          this.logStats();
        }

        const data = JSON.parse(event.data);
        logger.debug('📥 Received streaming message:', {
          type: data.type,
          messageNumber: this.stats.messagesReceived,
          timestamp: new Date().toISOString()
        });

        options.onMessage?.(data);
      } catch (error) {
        logger.error('❌ Error processing stream message:', {
          error,
          rawData: event.data
        });
        options.onError?.(error);
      }
    };

    eventSource.onerror = (error) => {
      logger.error('❌ Stream connection error:', error);
      this.logStats(); // Log final stats on error
      options.onError?.(error);
      eventSource.close();
    };

    eventSource.addEventListener('complete', () => {
      logger.info('✅ Stream completed successfully');
      this.logStats(); // Log final stats on completion
      options.onComplete?.();
      eventSource.close();
    });

    return eventSource;
  }

  async startStreamingExecution(task: any, options: StreamingOptions = {}) {
    try {
      logger.info('🔄 Starting streaming execution:', task);
      
      // Prepare the POST data
      const postData = {
        content: task.prompt,
        type: task.type || 'general',
        canvasState: { projectId: task.canvasId },
        architecture: task.architecture,
        streamingEnabled: true
      };

      // Create EventSource URL with data in query params
      const url = new URL(`${this.baseUrl}/agents/ask`);
      url.searchParams.append('data', JSON.stringify(postData));
      
      // Create EventSource with the URL
      const eventSource = A2AStreamingService.setupEventSource(url.toString(), options);

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
            logger.debug(`📡 Received ${eventType} event:`, event.data);
            const data = JSON.parse(event.data);
            
            switch (eventType) {
              case 'error':
                logger.error('❌ Stream error:', data);
                if (options.onError) {
                  options.onError(data);
                }
                eventSource.close();
                break;
              
              case 'complete':
                logger.info('✅ Stream completed:', data);
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
            logger.warn(`⚠️ Error processing ${eventType} event:`, error);
          }
        });
      });

      // Clean up on unmount
      return () => {
        logger.info('🧹 Cleaning up streaming connection');
        eventSource.close();
      };

    } catch (error) {
      logger.error('❌ Streaming execution error:', error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
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

export const setupA2AStream = (url: string, options: StreamingOptions = {}): EventSource => {
  return A2AStreamingService.setupEventSource(url, options);
}; 