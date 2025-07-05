import React, { useState, useRef, useEffect } from 'react';
import { SSE } from 'sse.js';

// A2A Streaming Service - matches main application
class A2AStreamingService {
  constructor() {
    this.baseUrl = 'http://localhost:4000';
  }

  async startStreamingExecution(task, options = {}) {
    try {
      console.log('🔄 Starting streaming execution:', task);

      // Construct the URL
      const urlStr = `${this.baseUrl}/api/design/agents/ask`;

      // Setup SSE connection with POST
      const source = new SSE(urlStr, {
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          content: task.prompt,
          type: task.type || 'general',
          canvasState: task.canvasState,
          streamingEnabled: true
        }),
        method: 'POST'
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
        source.addEventListener(eventType, (e) => {
          try {
            const data = JSON.parse(e.data);
            console.log(`📡 ${eventType} event:`, data);

            if (eventType === 'error') {
              options.onError?.(data);
            } else if (eventType === 'complete') {
              options.onComplete?.(data);
            } else {
              options.onMessage?.(data);
            }
          } catch (error) {
            console.error(`Error handling ${eventType} event:`, error);
          }
        });
      });

      // Start streaming
      source.stream();

      // Return cleanup function
      return () => {
        source.close();
      };

    } catch (error) {
      console.error('❌ Streaming error:', error);
      throw error;
    }
  }
}

// Create streaming service instance
const streamingService = new A2AStreamingService();

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startStreaming = async () => {
    if (!input.trim() || isStreaming) return;

    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }]);

    setInput('');
    setIsStreaming(true);

    try {
      // Create streaming message placeholder
      const streamingId = Date.now() + 1;
      setMessages(prev => [...prev, {
        id: streamingId,
        type: 'agent',
        content: '',
        isStreaming: true,
        timestamp: new Date()
      }]);

      // Use A2A streaming service
      const cleanup = await streamingService.startStreamingExecution({
        prompt: input,
        type: 'chat',
        canvasState: {
          // Mock canvas state for testing
          nodes: [],
          edges: []
        }
      }, {
        onMessage: (data) => {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingId
              ? {
                  ...msg,
                  content: msg.content + (data.content || ''),
                  actions: data.actions
                }
              : msg
          ));
        },
        onError: (error) => {
          console.error('❌ Stream error:', error);
          setMessages(prev => prev.map(msg => 
            msg.id === streamingId
              ? {
                  ...msg,
                  content: "Error: Connection failed. Please try again.",
                  isStreaming: false,
                  hasError: true
                }
              : msg
          ));
          setIsStreaming(false);
        },
        onComplete: (data) => {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingId
              ? {
                  ...msg,
                  content: msg.content + (data.content || ''),
                  actions: data.actions,
                  isStreaming: false
                }
              : msg
          ));
          setIsStreaming(false);
        }
      });

      // Cleanup on unmount
      return cleanup;

    } catch (error) {
      console.error('❌ Error:', error);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startStreaming();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>A2A Streaming Test with Gemini</h1>
      
      {/* Messages Container */}
      <div style={{ 
        height: '500px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        overflow: 'auto'
      }}>
        {messages.map(message => (
          <div 
            key={message.id}
            style={{
              marginBottom: '12px',
              textAlign: message.type === 'user' ? 'right' : 'left'
            }}
          >
            <div style={{
              display: 'inline-block',
              maxWidth: '70%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: message.type === 'user' ? '#007AFF' : '#E9ECEF',
              color: message.type === 'user' ? 'white' : 'black'
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
              
              {/* Show actions if any */}
              {message.actions && message.actions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Suggested Actions:</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {message.actions.map((action, index) => (
                      <button
                        key={index}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#E2E8F0',
                          color: '#1A202C',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {action.type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show streaming indicator */}
              {message.isStreaming && (
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  opacity: 0.7 
                }}>
                  Typing...
                </div>
              )}

              {/* Timestamp */}
              <div style={{ 
                fontSize: '10px', 
                opacity: 0.7,
                marginTop: '4px'
              }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything about system architecture..."
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '16px'
          }}
          disabled={isStreaming}
        />
        <button
          onClick={startStreaming}
          disabled={!input.trim() || isStreaming}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#007AFF',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: !input.trim() || isStreaming ? 0.5 : 1
          }}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App; 