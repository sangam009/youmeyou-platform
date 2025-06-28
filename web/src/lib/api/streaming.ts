import { API_BASE_URL } from '../config';

export interface StreamingOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export class StreamingConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
  private messageQueue: any[] = [];
  private lastEventId: string | null = null;

  constructor(private url: string, private options: StreamingOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.setupHeartbeat();
  }

  private setupHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.connectionState = 'connecting';
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.emit('connected', null);
        
        // Replay queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          this.ws?.send(JSON.stringify(msg));
        }
        
        // Request missed events if we have a last event ID
        if (this.lastEventId) {
          this.ws.send(JSON.stringify({
            type: 'recover',
            lastEventId: this.lastEventId
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update last event ID for recovery
          if (data.eventId) {
            this.lastEventId = data.eventId;
          }
          
          // Handle different message types
          switch (data.type) {
            case 'error':
              this.handleError(data);
              break;
            case 'heartbeat':
              // Heartbeat received, connection is alive
              break;
            default:
              this.emit('message', data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          this.emit('error', { error: 'Failed to parse message' });
        }
      };

      this.ws.onclose = (event) => {
        this.handleDisconnect(event);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { error: 'WebSocket error occurred' });
        
        // Close the connection to trigger reconnect
        this.ws?.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.handleDisconnect();
    }
  }

  private handleDisconnect(event?: CloseEvent) {
    this.connectionState = 'disconnected';
    this.emit('disconnected', null);
    
    // Attempt to reconnect if not explicitly closed
    if (event?.code !== 1000) {
      this.attemptReconnect();
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = 'failed';
      this.emit('failed', { error: 'Max reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    this.connect();
  }

  private handleError(data: any) {
    switch (data.code) {
      case 'AUTHENTICATION_FAILED':
        // Handle authentication errors
        this.emit('authError', data);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Handle rate limiting
        this.emit('rateLimitError', data);
        setTimeout(() => this.connect(), data.retryAfter || 5000);
        break;
      case 'INVALID_MESSAGE':
        // Handle invalid message format
        this.emit('error', data);
        break;
      default:
        this.emit('error', data);
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      
      // Attempt to connect if disconnected
      if (this.connectionState === 'disconnected') {
        this.connect();
      }
    }
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000); // Normal closure
      this.ws = null;
    }
    this.connectionState = 'disconnected';
  }
}

// Helper functions to create streaming connections
export const createStreamingConnection = (endpoint: string, options: StreamingOptions = {}): StreamingConnection => {
  const connection = new StreamingConnection(`${API_BASE_URL}${endpoint}`, options);
  connection.connect();
  return connection;
}; 