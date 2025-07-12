#!/usr/bin/env node

/**
 * Simple test script for the new /simple-chat endpoint
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002/api/agents';

async function testSimpleChat() {
  console.log('🧪 Testing Simple Chat endpoint...\n');

  try {
    const response = await fetch(`${BASE_URL}/simple-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Hello! Can you help me create a simple web application architecture?',
        userId: 'test-user-123',
        canvasState: {
          projectId: 'test-project',
          canvasId: 'test-canvas',
          components: [],
          connections: []
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Connection established');
    console.log('📡 Streaming response:\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            
            switch (data.type) {
              case 'text':
                process.stdout.write(data.content);
                break;
              case 'action_executed':
                console.log(`\n🎯 Action executed: ${data.action.type}`);
                console.log(`   Result: ${data.result.success ? '✅ Success' : '❌ Failed'}`);
                break;
              case 'complete':
                console.log('\n\n✅ Stream completed');
                break;
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON data
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSimpleChat().then(() => {
  console.log('\n🎉 Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 