import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());

// A2A Protocol States
const A2A_STATES = {
  TASK_ANALYSIS: 'task_analysis',
  AGENT_START: 'agent_start',
  AGENT_THINKING: 'agent_thinking',
  AGENT_RESPONSE: 'agent_response',
  AGENT_ACTION: 'agent_action',
  AGENT_COMPLETE: 'agent_complete',
  ERROR: 'error'
};

// A2A Agent Card - Define our test agent capabilities
const TEST_AGENT_CARD = {
  name: 'YouMeYou Design Test Agent',
  description: 'Test agent for A2A streaming implementation',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true
  },
  skills: [
    {
      id: 'architecture_design',
      name: 'Architecture Design',
      description: 'Design system architecture and components',
      tags: ['architecture', 'system-design', 'scalability']
    },
    {
      id: 'code_generation',
      name: 'Code Generation',
      description: 'Generate implementation code and tests',
      tags: ['code', 'implementation', 'testing']
    }
  ]
};

// Helper function to stream A2A responses
async function* streamA2AResponse(prompt, context = {}) {
  try {
    // 1. Task Analysis Phase
    yield {
      event: A2A_STATES.TASK_ANALYSIS,
      data: {
        type: A2A_STATES.TASK_ANALYSIS,
        content: 'Analyzing task requirements and context...',
        analysis: {
          task_type: 'architecture_design',
          complexity: 'medium',
          required_skills: ['system_design', 'performance_optimization'],
          estimated_time: '5-10 minutes'
        }
      }
    };

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Agent Start Phase
    yield {
      event: A2A_STATES.AGENT_START,
      data: {
        type: A2A_STATES.AGENT_START,
        content: 'Architecture Agent activated. Starting design process...',
        agent: {
          id: 'test-agent-1',
          name: 'Test Architecture Agent',
          capabilities: TEST_AGENT_CARD.skills.map(s => s.id)
        }
      }
    };

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Create chat instance for continuous conversation
    const chat = model.startChat({
      history: context.history || [],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
      }
    });

    // 4. Stream the main response with thinking states
    const result = await chat.sendMessage(prompt, {
      stream: true
    });
    
    let messageCount = 0;
    let currentThought = '';
    let suggestedActions = [];

    for await (const chunk of result.stream) {
      messageCount++;
      const chunkText = chunk.text();
      currentThought += chunkText;

      // Every few chunks, emit a thinking state
      if (messageCount % 3 === 0) {
        yield {
          event: A2A_STATES.AGENT_THINKING,
          data: {
            type: A2A_STATES.AGENT_THINKING,
            content: 'Processing and analyzing...',
            progress: Math.min((messageCount / 10) * 100, 90)
          }
        };
      }

      // Emit the actual response chunk
      yield {
        event: A2A_STATES.AGENT_RESPONSE,
        data: {
          type: A2A_STATES.AGENT_RESPONSE,
          content: chunkText,
          messageId: `msg-${messageCount}`,
          timestamp: new Date().toISOString()
        }
      };

      // Analyze for potential actions (simplified for test)
      if (currentThought.toLowerCase().includes('add') || currentThought.toLowerCase().includes('create')) {
        suggestedActions.push({
          type: 'ADD_COMPONENT',
          status: 'ready',
          component: {
            type: 'microservice',
            name: 'New Service',
            properties: { scalable: true }
          }
        });
      }
    }

    // 5. If any actions were detected, emit them
    if (suggestedActions.length > 0) {
      yield {
        event: A2A_STATES.AGENT_ACTION,
        data: {
          type: A2A_STATES.AGENT_ACTION,
          content: 'Suggested architecture changes:',
          actions: suggestedActions
        }
      };
    }

    // 6. Complete the interaction
    yield {
      event: A2A_STATES.AGENT_COMPLETE,
      data: {
        type: A2A_STATES.AGENT_COMPLETE,
        content: 'Task completed successfully',
        summary: currentThought,
        metadata: {
          executionTime: Date.now(),
          messageCount,
          suggestedActionsCount: suggestedActions.length
        }
      }
    };

  } catch (error) {
    console.error('Stream error:', error);
    yield {
      event: A2A_STATES.ERROR,
      data: {
        type: A2A_STATES.ERROR,
        error: 'Failed to process request',
        details: error.message
      }
    };
  }
}

// A2A streaming endpoint
app.post('/api/design/agents/ask', async (req, res) => {
  const { content, context = {} } = req.body;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ 
    status: 'connected', 
    protocol: 'A2A',
    agent: TEST_AGENT_CARD
  })}\n\n`);

  try {
    // Stream A2A response with proper protocol states
    for await (const { event, data } of streamA2AResponse(content, context)) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`event: ${A2A_STATES.ERROR}\ndata: ${JSON.stringify({ 
      type: A2A_STATES.ERROR,
      error: 'A2A stream failed',
      details: error.message 
    })}\n\n`);
  } finally {
    res.end();
  }

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client disconnected from A2A stream');
  });
});

// Serve agent card at well-known location
app.get('/.well-known/agent.json', (req, res) => {
  res.json(TEST_AGENT_CARD);
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 A2A Test Server running on port ${PORT}`);
}); 