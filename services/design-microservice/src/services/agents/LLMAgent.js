import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';

/**
 * LLM Agent - Powered by Gemini for complex reasoning and generation
 * This agent is used by specialized agents for LLM-powered tasks
 */
export class LLMAgent {
  constructor() {
    // Initialize Gemini LLM connection
    if (!process.env.GOOGLE_AI_KEY) {
      throw new Error('GOOGLE_AI_KEY environment variable is required for LLMAgent');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
    
    // Conversation memory for context continuity
    this.conversationHistory = new Map();
    
    logger.info('🤖 LLMAgent initialized with Gemini 2.0 Flash and real LLM connection');
    this.testConnection();
  }

  async testConnection() {
    try {
      const testResult = await this.model.generateContent("Hello, please respond with 'LLM connection successful'");
      const response = testResult.response.text();
      logger.info('✅ LLM connection test successful:', response.substring(0, 50));
    } catch (error) {
      logger.error('❌ LLM connection test failed:', error.message);
    }
  }

  /**
   * Main execution method for LLM-powered tasks
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info('🧠 LLMAgent executing task:', userQuery.substring(0, 100));
      
      // Build enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(userQuery, context);
      
      // Generate response with Gemini
      const result = await this.model.generateContent(enhancedPrompt);
      const response = result.response;
      
      return {
        content: response.text(),
        analysis: 'LLM-powered analysis completed',
        suggestions: this.extractSuggestions(response.text()),
        metadata: {
          model: 'gemini-2.0-flash-exp',
          tokens: response.text().length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error('❌ LLMAgent execution error:', error);
      throw error;
    }
  }

  /**
   * Collaborate with specialized agents
   */
  async collaborateWithAgent(agentName, task, context = {}) {
    try {
      logger.info(`🤝 LLMAgent collaborating with ${agentName} on task:`, task.substring(0, 100));
      
      // Build agent-specific prompt
      const collaborationPrompt = this.buildCollaborationPrompt(agentName, task, context);
      
      // Generate response
      const result = await this.model.generateContent(collaborationPrompt);
      const response = result.response;
      
      // Store conversation for context
      this.storeConversation(agentName, task, response.text());
      
      return {
        agentCollaboration: agentName,
        response: response.text(),
        analysis: this.analyzeResponse(response.text(), agentName),
        nextSteps: this.generateNextSteps(response.text(), agentName),
        metadata: {
          collaboratingAgent: agentName,
          model: 'gemini-2.0-flash-exp',
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`❌ Error collaborating with ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Multi-turn conversation with context memory
   */
  async continueConversation(agentName, newPrompt, context = {}) {
    try {
      logger.info(`💬 Continuing conversation with ${agentName}`);
      
      // Get conversation history
      const history = this.getConversationHistory(agentName);
      
      // Build context-aware prompt
      const contextPrompt = this.buildContextualPrompt(newPrompt, history, context);
      
      // Generate response
      const result = await this.model.generateContent(contextPrompt);
      const response = result.response;
      
      // Update conversation history
      this.updateConversationHistory(agentName, newPrompt, response.text());
      
      return {
        response: response.text(),
        conversationTurn: history.length + 1,
        analysis: this.analyzeConversationProgress(history, response.text()),
        metadata: {
          agentName,
          conversationLength: history.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`❌ Error in conversation with ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt with context
   */
  buildEnhancedPrompt(userQuery, context) {
    const systemContext = this.buildSystemContext(context);
    
    return `${systemContext}

USER REQUEST:
${userQuery}

INSTRUCTIONS:
1. Analyze the request thoroughly
2. Provide specific, actionable guidance
3. Consider the project context and constraints
4. Suggest next steps and improvements
5. Format response clearly with sections

Please provide a comprehensive response that addresses all aspects of the request.`;
  }

  /**
   * Build collaboration prompt for agent interaction
   */
  buildCollaborationPrompt(agentName, task, context) {
    const agentPersonas = {
      'architectureDesigner': 'You are a Senior System Architect with expertise in scalable system design, microservices, and architectural patterns.',
      'databaseDesigner': 'You are a Database Architect specializing in schema design, optimization, and data modeling.',
      'apiDesigner': 'You are an API Architect focused on RESTful design, API security, and integration patterns.',
      'codeGenerator': 'You are a Senior Software Engineer specializing in clean code, testing, and implementation best practices.',
      'projectManager': 'You are a Technical Project Manager with expertise in agile methodologies and team coordination.',
      'techLead': 'You are a Technical Lead responsible for architectural decisions, code quality, and team guidance.'
    };

    const persona = agentPersonas[agentName] || 'You are a technical expert.';
    const systemContext = this.buildSystemContext(context);

    return `${persona}

${systemContext}

COLLABORATION TASK:
${task}

COLLABORATION GUIDELINES:
1. Focus on your area of expertise (${agentName})
2. Provide specific, implementable recommendations
3. Consider integration with other system components
4. Identify potential issues and solutions
5. Suggest concrete next steps

Please provide your expert analysis and recommendations for this task.`;
  }

  /**
   * Build system context from provided context
   */
  buildSystemContext(context) {
    let systemContext = 'SYSTEM CONTEXT:\n';
    
    if (context.complexity) {
      systemContext += `- Task Complexity: ${context.complexity}\n`;
    }
    
    if (context.taskType) {
      systemContext += `- Task Type: ${context.taskType}\n`;
    }
    
    if (context.canvasState && context.canvasState.nodes) {
      systemContext += `- Current Canvas: ${context.canvasState.nodes.length} components\n`;
    }
    
    if (context.requiredSkills && context.requiredSkills.length > 0) {
      systemContext += `- Required Skills: ${context.requiredSkills.join(', ')}\n`;
    }
    
    if (context.subTasks && context.subTasks.length > 0) {
      systemContext += `- Sub-tasks: ${context.subTasks.length} identified\n`;
    }
    
    return systemContext;
  }

  /**
   * Extract suggestions from response
   */
  extractSuggestions(responseText) {
    const suggestions = [];
    
    // Look for numbered lists or bullet points
    const lines = responseText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const suggestion = trimmed.replace(/^\d+\./, '').replace(/^[-•]\s*/, '').trim();
        if (suggestion.length > 10) {
          suggestions.push(suggestion);
        }
      }
    }
    
    // Fallback: extract sentences that sound like recommendations
    if (suggestions.length === 0) {
      const sentences = responseText.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('recommend') || 
            sentence.toLowerCase().includes('suggest') ||
            sentence.toLowerCase().includes('should')) {
          suggestions.push(sentence.trim());
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Analyze response based on agent type
   */
  analyzeResponse(responseText, agentName) {
    const analysisKeywords = {
      'architectureDesigner': ['scalability', 'performance', 'architecture', 'pattern'],
      'databaseDesigner': ['schema', 'optimization', 'data', 'query'],
      'apiDesigner': ['endpoint', 'authentication', 'integration', 'rest'],
      'codeGenerator': ['implementation', 'testing', 'clean code', 'best practices'],
      'projectManager': ['timeline', 'resources', 'coordination', 'planning'],
      'techLead': ['quality', 'standards', 'architecture', 'guidance']
    };

    const keywords = analysisKeywords[agentName] || [];
    const foundKeywords = keywords.filter(keyword => 
      responseText.toLowerCase().includes(keyword)
    );

    return `${agentName} analysis completed. Covered areas: ${foundKeywords.join(', ')}`;
  }

  /**
   * Generate next steps based on response
   */
  generateNextSteps(responseText, agentName) {
    const nextSteps = [];
    
    // Extract action items from response
    const actionWords = ['implement', 'create', 'design', 'build', 'configure', 'setup', 'develop'];
    const sentences = responseText.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const hasActionWord = actionWords.some(word => 
        sentence.toLowerCase().includes(word)
      );
      
      if (hasActionWord && sentence.length > 20) {
        nextSteps.push(sentence.trim());
      }
    }
    
    return nextSteps.slice(0, 3); // Limit to 3 next steps
  }

  /**
   * Store conversation for context
   */
  storeConversation(agentName, prompt, response) {
    if (!this.conversationHistory.has(agentName)) {
      this.conversationHistory.set(agentName, []);
    }
    
    const history = this.conversationHistory.get(agentName);
    history.push({
      prompt,
      response,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 exchanges to manage memory
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get conversation history for an agent
   */
  getConversationHistory(agentName) {
    return this.conversationHistory.get(agentName) || [];
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(agentName, prompt, response) {
    this.storeConversation(agentName, prompt, response);
  }

  /**
   * Build contextual prompt with history
   */
  buildContextualPrompt(newPrompt, history, context) {
    let contextualPrompt = 'CONVERSATION HISTORY:\n';
    
    // Add recent history for context
    const recentHistory = history.slice(-3); // Last 3 exchanges
    for (const exchange of recentHistory) {
      contextualPrompt += `Previous: ${exchange.prompt.substring(0, 100)}...\n`;
      contextualPrompt += `Response: ${exchange.response.substring(0, 100)}...\n\n`;
    }
    
    contextualPrompt += `NEW REQUEST:\n${newPrompt}\n\n`;
    contextualPrompt += `Please continue the conversation considering the previous context.`;
    
    return contextualPrompt;
  }

  /**
   * Analyze conversation progress
   */
  analyzeConversationProgress(history, newResponse) {
    const totalExchanges = history.length + 1;
    const progressIndicators = ['progress', 'complete', 'done', 'finished', 'ready'];
    
    const hasProgress = progressIndicators.some(indicator => 
      newResponse.toLowerCase().includes(indicator)
    );
    
    return `Conversation turn ${totalExchanges}. Progress: ${hasProgress ? 'advancing' : 'continuing'}`;
  }

  /**
   * Clear conversation history for an agent
   */
  clearConversationHistory(agentName) {
    this.conversationHistory.delete(agentName);
    logger.info(`🧹 Cleared conversation history for ${agentName}`);
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      status: 'active',
      model: 'gemini-2.0-flash-exp',
      activeConversations: this.conversationHistory.size,
      capabilities: [
        'complex reasoning',
        'code generation',
        'architecture analysis',
        'multi-turn conversations',
        'agent collaboration'
      ],
      lastActivity: new Date().toISOString()
    };
  }
} 