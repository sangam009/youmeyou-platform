import { SSE } from 'sse.js';
import logger from '@/lib/logger';
import { StreamingOptions } from './streaming';
import { config } from '../config';

// Extend StreamingOptions to include onMessage
interface ExtendedStreamingOptions extends StreamingOptions {
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

  public static setupSSE(url: string, postData: any, options: ExtendedStreamingOptions = {}): SSE {
    // Reset stats for new connection
    this.resetStats();
    this.stats.startTime = Date.now();

    const source = new SSE(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(postData),
      method: 'POST',
      withCredentials: true
    });

    // Handle connection open
    source.addEventListener('open', () => {
      logger.info('🔌 SSE connection opened');
    });

    // Handle errors
    source.addEventListener('error', (error: Event) => {
      logger.error('❌ SSE error:', error);
      if (options.onError) {
        options.onError(error);
      }
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
      source.addEventListener(eventType, (event: MessageEvent) => {
        try {
          logger.debug(`📡 Received ${eventType} event:`, event.data);
          const data = JSON.parse(event.data);
          
          switch (eventType) {
            case 'error':
              logger.error('❌ Stream error:', data);
              if (options.onError) {
                options.onError(data);
              }
              source.close();
              break;
            
            case 'complete':
              logger.info('✅ Stream completed:', data);
              if (options.onComplete) {
                options.onComplete(data.result);
              }
              source.close();
              break;
            
            case 'connected':
              logger.info('🔌 Stream connected:', data);
              break;

            case 'agent_start':
              logger.info('🤖 Agent started:', data);
              break;

            case 'agent_complete':
              logger.info('✨ Agent completed:', data);
              break;

            case 'task_analysis':
              logger.info('🔍 Task analysis:', data);
              break;

            case 'task_division':
              logger.info('📋 Task division:', data);
              break;

            default:
              // Process all other events through the message handler
              if (options.onMessage) {
                options.onMessage(data);
              }
          }
        } catch (error) {
          logger.warn(`⚠️ Error processing ${eventType} event:`, error);
        }
      });
    });

    return source;
  }

  async startStreamingExecution(task: any, options: ExtendedStreamingOptions = {}) {
    try {
      logger.info('🔄 Starting streaming execution:', {
        task,
        baseUrl: this.baseUrl
      });
      
      // Prepare the POST data
      const postData = {
        content: task.prompt,
        type: task.type || 'general',
        canvasState: { projectId: task.canvasId },
        architecture: task.architecture,
        streamingEnabled: true
      };

      // Construct the URL properly based on whether baseUrl is relative or absolute
      const urlStr = this.baseUrl.startsWith('http') 
        ? `${this.baseUrl}/agents/ask` // Absolute URL
        : `${window.location.origin}${this.baseUrl}/agents/ask`; // Relative URL

      logger.info('📡 Setting up SSE connection with POST:', {
        url: urlStr,
        postData
      });

      // Create SSE connection with POST support
      const source = A2AStreamingService.setupSSE(urlStr, postData, options);

      // Start the connection
      source.stream();

      // Return cleanup function
      return () => {
        logger.info('🧹 Cleaning up SSE connection');
        source.close();
      };

    } catch (error) {
      logger.error('❌ Error in startStreamingExecution:', error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  private processStreamChunk(data: any, options: ExtendedStreamingOptions) {
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
  async startArchitectureDesign(canvasId: string, requirements: string, options: ExtendedStreamingOptions = {}) {
    return this.startStreamingExecution({
      id: `arch-${canvasId}`,
      prompt: `Design architecture for: ${requirements}`,
      type: 'ARCHITECTURE_DESIGN',
      canvasId
    }, options);
  }

  // Helper method to start code generation streaming
  async startCodeGeneration(canvasId: string, architecture: any, options: ExtendedStreamingOptions = {}) {
    return this.startStreamingExecution({
      id: `code-${canvasId}`,
      prompt: `Generate code based on architecture`,
      type: 'CODE_GENERATION',
      canvasId,
      architecture
    }, options);
  }
}

export const setupA2AStream = (url: string, options: StreamingOptions = {}): SSE => {
  return A2AStreamingService.setupSSE(url, options);
}; 