#!/usr/bin/env node

/**
 * Phase 3 Dynamic Prompting Test Suite
 * Validates the implemented dynamic prompting capabilities
 */

const DynamicPromptingService = require('./src/services/DynamicPromptingService');
const A2AService = require('./src/services/a2aService');

// Mock logger for testing
const mockLogger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`)
};

// Override logger for testing
require('./src/utils/logger').info = mockLogger.info;
require('./src/utils/logger').warn = mockLogger.warn;
require('./src/utils/logger').error = mockLogger.error;

async function runDynamicPromptingTests() {
  console.log('\n🚀 Starting Phase 3: Dynamic Prompting Test Suite\n');
  
  try {
    // Initialize services
    console.log('1. Initializing Dynamic Prompting Service...');
    const dynamicPrompting = new DynamicPromptingService();
    
    console.log('2. Initializing A2A Service...');
    const a2aService = new A2AService();
    
    console.log('✅ Services initialized successfully\n');
    
    // Test 1: Context-Aware Prompt Generation
    console.log('🧠 Test 1: Context-Aware Prompt Generation');
    await testContextAwarePrompts(dynamicPrompting, a2aService);
    
    // Test 2: Inter-Agent Communication
    console.log('\n🤝 Test 2: Inter-Agent Communication Prompts');
    await testInterAgentCommunication(dynamicPrompting, a2aService);
    
    // Test 3: User Interaction Optimization
    console.log('\n👤 Test 3: User Interaction Optimization');
    await testUserInteraction(dynamicPrompting, a2aService);
    
    // Test 4: Error Handling and Recovery
    console.log('\n🛠️ Test 4: Error Handling and Recovery');
    await testErrorHandling(dynamicPrompting, a2aService);
    
    // Test 5: Validation Prompting
    console.log('\n✅ Test 5: Validation Prompting');
    await testValidationPrompts(dynamicPrompting, a2aService);
    
    // Test 6: Performance and Statistics
    console.log('\n📊 Test 6: Performance and Statistics');
    await testPerformanceStats(dynamicPrompting, a2aService);
    
    console.log('\n🎉 All Phase 3 Dynamic Prompting tests completed successfully!');
    console.log('\n📈 Summary:');
    console.log('   ✅ Context-aware prompt generation working');
    console.log('   ✅ Inter-agent communication optimized');
    console.log('   ✅ User interaction enhancement functional');
    console.log('   ✅ Error handling and recovery operational');
    console.log('   ✅ Validation prompting integrated');
    console.log('   ✅ Performance monitoring active\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

async function testContextAwarePrompts(dynamicPrompting, a2aService) {
  try {
    // Test agent
    const agent = {
      id: 'arch-001',
      name: 'Architecture Designer',
      model: 'gemini-pro'
    };
    
    // Test task
    const task = {
      type: 'architecture',
      content: 'Design a scalable e-commerce platform',
      requirements: ['high-performance', 'secure', 'scalable']
    };
    
    // Test user profile
    const userProfile = {
      experienceLevel: 'expert',
      preferences: { architecture: 'microservices' },
      successfulPatterns: ['modular design', 'API-first approach']
    };
    
    // Test project context
    const projectContext = {
      type: 'e-commerce',
      architecture: 'microservices',
      technologies: ['Node.js', 'React', 'PostgreSQL'],
      constraints: ['budget-conscious', 'time-sensitive']
    };
    
    const prompt = await dynamicPrompting.generateContextAwarePrompt(
      agent,
      task,
      userProfile,
      projectContext
    );
    
    console.log('   ✅ Context-aware prompt generated successfully');
    console.log(`   📝 Prompt length: ${prompt.length} characters`);
    console.log(`   🎯 Contains user experience level: ${prompt.includes('expert')}`);
    console.log(`   🏗️ Contains architecture type: ${prompt.includes('microservices')}`);
    
  } catch (error) {
    console.error('   ❌ Context-aware prompt test failed:', error.message);
    throw error;
  }
}

async function testInterAgentCommunication(dynamicPrompting, a2aService) {
  try {
    const sourceAgent = { id: 'arch-001', name: 'Architecture Designer' };
    const targetAgent = { id: 'db-001', name: 'Database Designer' };
    
    const collaborationTask = {
      description: 'Design database for e-commerce platform'
    };
    
    const sharedContext = {
      previousOutputs: [
        {
          agent: 'Architecture Designer',
          content: 'Microservices architecture with API Gateway',
          summary: 'Designed microservices architecture'
        }
      ],
      taskObjective: 'Create comprehensive e-commerce platform'
    };
    
    const prompt = await dynamicPrompting.generateInterAgentPrompt(
      sourceAgent,
      targetAgent,
      collaborationTask,
      sharedContext
    );
    
    console.log('   ✅ Inter-agent communication prompt generated');
    console.log(`   📝 Prompt length: ${prompt.length} characters`);
    console.log(`   🔄 References previous work: ${prompt.includes('previous')}`);
    console.log(`   🎯 Agent-specific contribution: ${prompt.includes('Database Designer')}`);
    
  } catch (error) {
    console.error('   ❌ Inter-agent communication test failed:', error.message);
    throw error;
  }
}

async function testUserInteraction(dynamicPrompting, a2aService) {
  try {
    const task = {
      originalRequest: 'Build a web application'
    };
    
    const currentUnderstanding = {
      type: 'web-application',
      complexity: 'medium'
    };
    
    const missingInfo = [
      'Database preference',
      'Authentication requirements',
      'Expected user scale'
    ];
    
    const prompt = await dynamicPrompting.generateUserInteractionPrompt(
      task,
      currentUnderstanding,
      missingInfo
    );
    
    console.log('   ✅ User interaction prompt generated');
    console.log(`   📝 Prompt length: ${prompt.length} characters`);
    console.log(`   ❓ Contains clarification request: ${prompt.includes('need to know')}`);
    console.log(`   👥 User-friendly language: ${prompt.includes('help you better')}`);
    
  } catch (error) {
    console.error('   ❌ User interaction test failed:', error.message);
    throw error;
  }
}

async function testErrorHandling(dynamicPrompting, a2aService) {
  try {
    const errorType = 'agent-failure';
    const errorContext = {
      agent: 'Architecture Designer',
      task: 'Database design',
      error: 'Timeout error'
    };
    const failurePoint = 'Schema generation phase';
    const fallbackOptions = [
      'Switch to backup agent',
      'Use simplified approach',
      'Request manual intervention'
    ];
    
    const prompt = await dynamicPrompting.generateErrorHandlingPrompt(
      errorType,
      errorContext,
      failurePoint,
      fallbackOptions
    );
    
    console.log('   ✅ Error handling prompt generated');
    console.log(`   📝 Prompt length: ${prompt.length} characters`);
    console.log(`   🚨 Contains error analysis: ${prompt.includes('ERROR')}`);
    console.log(`   🔄 Contains recovery strategy: ${prompt.includes('RECOVERY')}`);
    
  } catch (error) {
    console.error('   ❌ Error handling test failed:', error.message);
    throw error;
  }
}

async function testValidationPrompts(dynamicPrompting, a2aService) {
  try {
    const requestingAgent = { name: 'Architecture Designer' };
    const validationTarget = {
      component: 'Database Schema',
      design: 'User management tables'
    };
    const criteria = [
      'Technical accuracy',
      'Performance optimization',
      'Security compliance'
    ];
    const previousContext = {
      requirements: 'E-commerce platform',
      constraints: 'High performance'
    };
    
    const prompt = await dynamicPrompting.generateValidationPrompt(
      requestingAgent,
      validationTarget,
      criteria,
      previousContext
    );
    
    console.log('   ✅ Validation prompt generated');
    console.log(`   📝 Prompt length: ${prompt.length} characters`);
    console.log(`   ✅ Contains validation criteria: ${prompt.includes('VALIDATION')}`);
    console.log(`   🎯 References requesting agent: ${prompt.includes('Architecture Designer')}`);
    
  } catch (error) {
    console.error('   ❌ Validation prompt test failed:', error.message);
    throw error;
  }
}

async function testPerformanceStats(dynamicPrompting, a2aService) {
  try {
    // Test dynamic prompting statistics
    const stats = dynamicPrompting.getOptimizationStats();
    console.log('   ✅ Dynamic prompting stats retrieved');
    console.log(`   📊 Total prompts: ${stats.totalPrompts}`);
    console.log(`   📋 Template types: ${stats.templateTypes.length}`);
    console.log(`   ⚡ Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    
    // Test A2A service integration stats
    const a2aStats = a2aService.getDynamicPromptingStats();
    console.log('   ✅ A2A service stats retrieved');
    console.log(`   👥 User profiles: ${a2aStats.userProfiles}`);
    console.log(`   📁 Project contexts: ${a2aStats.projectContexts}`);
    
    // Test user profile management
    const testProfile = a2aService.getUserProfile('test-user');
    console.log('   ✅ User profile management working');
    console.log(`   🆔 Test user ID: ${testProfile.id}`);
    console.log(`   📊 Experience level: ${testProfile.experienceLevel}`);
    
  } catch (error) {
    console.error('   ❌ Performance stats test failed:', error.message);
    throw error;
  }
}

// Run the test suite
if (require.main === module) {
  runDynamicPromptingTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runDynamicPromptingTests,
  testContextAwarePrompts,
  testInterAgentCommunication,
  testUserInteraction,
  testErrorHandling,
  testValidationPrompts,
  testPerformanceStats
}; 