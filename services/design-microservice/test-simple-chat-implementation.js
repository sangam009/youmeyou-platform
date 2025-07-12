import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testSimpleChatImplementation() {
  console.log('🧪 Testing Simple Chat Implementation...\n');

  // Test 1: Health Check
  console.log('1. Testing health check...');
  try {
    const response = await fetch(`${BASE_URL}/api/simple-chat/health`);
    const data = await response.json();
    console.log('✅ Health check response:', data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Get Capabilities
  console.log('\n2. Testing capabilities...');
  try {
    const response = await fetch(`${BASE_URL}/api/simple-chat/capabilities`);
    const data = await response.json();
    console.log('✅ Capabilities response:', data);
  } catch (error) {
    console.log('❌ Capabilities failed:', error.message);
  }

  // Test 3: Test Intent Classification
  console.log('\n3. Testing intent classification...');
  try {
    const testPrompts = [
      'Hello, how are you?',
      'Design a microservices architecture for an e-commerce platform',
      'What is the weather like today?',
      'Create a React component for user authentication'
    ];

    for (const prompt of testPrompts) {
      const response = await fetch(`${BASE_URL}/api/simple-chat/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      console.log(`✅ Intent for "${prompt.substring(0, 50)}...":`, data.data?.intentClassification);
    }
  } catch (error) {
    console.log('❌ Intent classification test failed:', error.message);
  }

  // Test 4: Stream Chat (Casual)
  console.log('\n4. Testing casual chat streaming...');
  try {
    const response = await fetch(`${BASE_URL}/api/simple-chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        prompt: 'Hello! How are you doing today?',
        userId: 'test-user'
      })
    });

    if (response.ok) {
      console.log('✅ Casual chat stream initiated successfully');
      console.log('Response headers:', response.headers.get('content-type'));
      
      // Read first few chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunks = 0;
      
      while (chunks < 3) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        console.log(`Chunk ${chunks + 1}:`, chunk.substring(0, 100) + '...');
        chunks++;
      }
      
      reader.releaseLock();
    } else {
      console.log('❌ Casual chat stream failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Casual chat stream test failed:', error.message);
  }

  // Test 5: Stream Chat (Technical)
  console.log('\n5. Testing technical chat streaming...');
  try {
    const response = await fetch(`${BASE_URL}/api/simple-chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        prompt: 'Design a microservices architecture for an e-commerce platform with user authentication, product catalog, and payment processing.',
        userId: 'test-user'
      })
    });

    if (response.ok) {
      console.log('✅ Technical chat stream initiated successfully');
      console.log('Response headers:', response.headers.get('content-type'));
      
      // Read first few chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunks = 0;
      
      while (chunks < 5) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        console.log(`Chunk ${chunks + 1}:`, chunk.substring(0, 100) + '...');
        chunks++;
      }
      
      reader.releaseLock();
    } else {
      console.log('❌ Technical chat stream failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Technical chat stream test failed:', error.message);
  }

  console.log('\n🎉 Simple Chat Implementation Test Complete!');
}

// Run the test
testSimpleChatImplementation().catch(console.error); 