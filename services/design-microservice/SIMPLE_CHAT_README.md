# Simple Chat Implementation

## Overview

This is a simplified, streamlined implementation of the design service chat functionality. It provides intent-based processing with real-time streaming responses and canvas action support.

## Features

### 🎯 Intent Classification
- **Casual Conversation**: Friendly, conversational responses for greetings and general questions
- **Technical Processing**: Advanced task breakdown and execution for technical queries

### 🔄 Task Breakdown
- Automatically divides complex technical prompts into manageable sub-tasks
- Sequential execution with dependency management
- Real-time progress tracking and status updates

### 📡 Real-time Streaming
- Server-Sent Events (SSE) for live response streaming
- Multiple event types for different stages of processing
- Canvas action updates streamed in real-time

### 🎨 Canvas Integration
- Automatic canvas state management
- Real-time component updates and additions
- Action-based architecture modifications

### 🔑 Dual API Key Support
- Primary and secondary Gemini API keys
- Automatic fallback on rate limits or errors
- Seamless key switching without interruption

## API Endpoints

### POST `/api/simple-chat/stream`
Main streaming endpoint that processes prompts and returns real-time responses.

**Request Body:**
```json
{
  "prompt": "Design a microservices architecture for an e-commerce platform",
  "canvasId": "optional-canvas-id",
  "userId": "user-123"
}
```

**Response:** Server-Sent Events stream with various event types:
- `connected`: Initial connection confirmation
- `intent`: Intent classification result
- `task_breakdown`: Technical task breakdown
- `task_start`: Individual task start
- `message`: Streaming text content
- `action`: Canvas action execution
- `task_complete`: Task completion
- `complete`: Full completion
- `error`: Error handling

### GET `/api/simple-chat/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "simple-chat",
  "timestamp": "2024-01-20T12:00:00Z",
  "geminiService": {
    "initialized": true,
    "currentKeyIndex": 0
  }
}
```

### GET `/api/simple-chat/capabilities`
Returns supported capabilities and configuration.

**Response:**
```json
{
  "success": true,
  "capabilities": {
    "streaming": true,
    "intentClassification": true,
    "taskBreakdown": true,
    "canvasActions": true,
    "casualConversation": true,
    "technicalProcessing": true,
    "multiKeyFallback": true,
    "supportedIntents": ["casual", "technical"],
    "supportedActions": ["canvas_update", "add_component", "update_component", "remove_component", "add_connection", "update_metadata"],
    "maxPromptLength": 10000,
    "maxSubPrompts": 5
  }
}
```

### POST `/api/simple-chat/test`
Test endpoint for intent classification and task breakdown testing.

**Request Body:**
```json
{
  "prompt": "Hello, how are you?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalPrompt": "Hello, how are you?",
    "intentClassification": {
      "intent": "casual",
      "confidence": 0.9,
      "reasoning": "This is a casual greeting"
    },
    "taskBreakdown": null
  }
}
```

## Event Types

### Intent Classification Events
```json
{
  "type": "intent_classified",
  "intent": "casual|technical",
  "message": "Intent classification message"
}
```

### Task Breakdown Events
```json
{
  "type": "task_breakdown",
  "tasks": [
    {
      "id": "task_1",
      "title": "Task Title",
      "sequence": 1
    }
  ],
  "totalTasks": 3,
  "executionStrategy": "sequential"
}
```

### Task Processing Events
```json
{
  "type": "task_start",
  "task": {
    "id": "task_1",
    "title": "Task Title",
    "sequence": 1
  }
}
```

### Message Events
```json
{
  "type": "text",
  "content": "Streaming text content",
  "taskId": "task_1",
  "taskTitle": "Task Title"
}
```

### Action Events
```json
{
  "type": "action_executed",
  "action": {
    "type": "add_component",
    "data": {
      "name": "User Authentication Service",
      "type": "microservice"
    }
  },
  "result": {
    "success": true,
    "message": "Component added successfully"
  }
}
```

## Usage Examples

### Frontend Integration (JavaScript)

```javascript
async function streamChat(prompt, canvasId = null) {
  const response = await fetch('/api/simple-chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      prompt: prompt,
      canvasId: canvasId,
      userId: currentUser.id
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.substring(5));
          handleEvent(data);
        } catch (e) {
          console.warn('Failed to parse event:', line);
        }
      }
    }
  }
}

function handleEvent(data) {
  switch (data.type) {
    case 'intent_classified':
      showIntentClassification(data);
      break;
    case 'task_breakdown':
      showTaskBreakdown(data);
      break;
    case 'text':
      appendMessage(data.content);
      break;
    case 'action_executed':
      updateCanvas(data.action);
      break;
    case 'complete':
      showCompletion(data);
      break;
    case 'error':
      showError(data.message);
      break;
  }
}
```

### React Integration

```jsx
import { useState, useEffect } from 'react';

function SimpleChatComponent() {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [events, setEvents] = useState([]);

  const startChat = async (prompt) => {
    setIsStreaming(true);
    setEvents([]);
    
    try {
      const response = await fetch('/api/simple-chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          userId: user.id
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        processChunk(chunk);
      }
    } catch (error) {
      console.error('Stream error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const processChunk = (chunk) => {
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.substring(5));
          setEvents(prev => [...prev, data]);
          
          if (data.type === 'text') {
            setResponse(prev => prev + data.content);
          }
        } catch (e) {
          console.warn('Failed to parse event:', line);
        }
      }
    }
  };

  return (
    <div>
      <button onClick={() => startChat('Design a microservices architecture')} disabled={isStreaming}>
        {isStreaming ? 'Processing...' : 'Start Chat'}
      </button>
      
      <div>
        {events.map((event, index) => (
          <div key={index} className={`event ${event.type}`}>
            {JSON.stringify(event, null, 2)}
          </div>
        ))}
      </div>
      
      <div>
        <h3>Response:</h3>
        <pre>{response}</pre>
      </div>
    </div>
  );
}
```

## Testing

### Running Tests

1. **Start the service:**
   ```bash
   cd services/design-microservice
   npm start
   ```

2. **Run the test script:**
   ```bash
   node test-simple-chat-implementation.js
   ```

3. **Use the HTML test client:**
   Open `test-client.html` in a browser and test the streaming functionality.

### Test Files

- `test-simple-chat-implementation.js`: Node.js test script
- `test-client.html`: HTML test client with UI
- Both files include comprehensive test cases for all functionality

## Architecture

### Service Structure

```
services/design-microservice/src/
├── controllers/
│   └── simpleChatController.js      # Main controller
├── services/
│   ├── EnhancedGeminiService.js     # Enhanced Gemini service
│   ├── TaskPromptService.js         # Task breakdown service
│   └── SimpleActionExecutor.js      # Action execution
├── routes/
│   └── simpleChat.js                # Route definitions
└── index.js                         # Main server (updated)
```

### Key Components

1. **EnhancedGeminiService**: Handles intent classification and processing
2. **TaskPromptService**: Divides complex prompts into manageable sub-tasks
3. **SimpleActionExecutor**: Executes canvas actions and updates
4. **SimpleChatController**: Main controller managing the streaming flow

## Configuration

### Environment Variables

```bash
# Gemini API Keys (required)
GEMINI_API_KEY=your_primary_key_here
GEMINI_API_KEY_2=your_secondary_key_here

# Service Configuration
PORT=3001
NODE_ENV=development
```

### API Key Setup

The service uses two Gemini API keys for redundancy:
- Primary key: `GEMINI_API_KEY`
- Secondary key: `GEMINI_API_KEY_2`

If the primary key hits rate limits, the service automatically switches to the secondary key.

## Error Handling

The implementation includes comprehensive error handling:

- **API Key Failures**: Automatic fallback to secondary key
- **Rate Limiting**: Smart retry logic with exponential backoff
- **Network Errors**: Graceful degradation and error reporting
- **Stream Interruptions**: Proper cleanup and reconnection support

## Performance Considerations

- **Streaming**: Real-time response streaming for better user experience
- **Chunked Processing**: Large responses are processed in chunks
- **Memory Management**: Efficient memory usage with stream processing
- **Concurrent Handling**: Multiple simultaneous chat sessions supported

## Future Enhancements

- [ ] WebSocket support for bidirectional communication
- [ ] Message history and conversation context
- [ ] Custom intent classification models
- [ ] Advanced canvas manipulation features
- [ ] Multi-language support
- [ ] Voice input/output integration

## Troubleshooting

### Common Issues

1. **Stream not starting**: Check API keys and authentication
2. **No response**: Verify server is running and endpoints are accessible
3. **Action execution fails**: Check canvas service connectivity
4. **Rate limiting**: Ensure both API keys are valid and have quota

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=simple-chat*
```

This will provide detailed logs for troubleshooting.

## Support

For issues or questions about this implementation, please refer to the main project documentation or create an issue in the project repository. 