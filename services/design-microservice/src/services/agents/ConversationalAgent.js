import logger from '../../utils/logger.js';
import { LLMAgent } from './LLMAgent.js';

/**
 * Base Conversational Agent - Implements Natural LLM Conversation Flow
 * Agents act as "owners" who converse with LLM until task is 80%+ complete
 */
export class ConversationalAgent {
  constructor(agentName, specialization) {
    this.agentName = agentName;
    this.specialization = specialization;
    this.completionThreshold = 0.8; // 80% completion threshold
    this.maxConversationTurns = 10; // Prevent infinite loops
    this.llmAgent = LLMAgent.getInstance(); // Initialize LLM agent once
    
    logger.info(`🤖 ConversationalAgent initialized: ${agentName} (${specialization})`);
  }

  /**
   * Main execution method - Natural conversation with LLM until task completion
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info(`🎯 ${this.agentName} starting natural conversation for task:`, userQuery.substring(0, 100));
      
      // Check if streaming is enabled
      if (context.streamingEnabled && context.streamingCallback) {
        return await this.executeWithStreaming(userQuery, context);
      }
      
      // Initialize conversation state
      const conversationState = {
        originalTask: userQuery,
        completionScore: 0.0,
        conversationTurns: 0,
        taskProgress: [],
        finalResult: null
      };

      // Start natural conversation loop
      while (conversationState.completionScore < this.completionThreshold && 
             conversationState.conversationTurns < this.maxConversationTurns) {
        
        conversationState.conversationTurns++;
        logger.info(`💬 ${this.agentName} - Conversation turn ${conversationState.conversationTurns}`);
        
        // Generate next prompt based on current progress
        const nextPrompt = this.generateNextPrompt(conversationState, context);
        
        // Converse with LLM
        let llmResponse;
        if (conversationState.conversationTurns === 1) {
          // First conversation
          llmResponse = await this.llmAgent.collaborateWithAgent(
            this.agentName,
            nextPrompt,
            context
          );
        } else {
          // Continue conversation
          llmResponse = await this.llmAgent.continueConversation(
            this.agentName,
            nextPrompt,
            { ...context, conversationState }
          );
        }

        // Analyze LLM response and update progress
        const progressAnalysis = await this.analyzeProgress(
          llmResponse, 
          conversationState, 
          context
        );
        
        conversationState.completionScore = progressAnalysis.completionScore;
        conversationState.taskProgress.push({
          turn: conversationState.conversationTurns,
          prompt: nextPrompt.substring(0, 200),
          response: llmResponse.response.substring(0, 500),
          completionScore: progressAnalysis.completionScore,
          missingElements: progressAnalysis.missingElements,
          timestamp: new Date().toISOString()
        });

        logger.info(`📊 ${this.agentName} - Progress: ${Math.round(progressAnalysis.completionScore * 100)}%`);
        
        // Check if task is sufficiently complete
        if (progressAnalysis.completionScore >= this.completionThreshold) {
          logger.info(`✅ ${this.agentName} - Task completed! (${Math.round(progressAnalysis.completionScore * 100)}%)`);
          conversationState.finalResult = llmResponse;
          break;
        }

        // Brief pause between conversation turns (prevent overwhelming LLM)
        await this.sleep(500);
      }

      // Compile final response
      return this.compileFinalResponse(conversationState, context);

    } catch (error) {
      logger.error(`❌ ${this.agentName} conversational execution error:`, error);
      return this.getFallbackResponse(userQuery, error);
    }
  }

  /**
   * Execute with streaming support for real-time updates
   */
  async executeWithStreaming(userQuery, context = {}) {
    try {
      logger.info(`🎯 ${this.agentName} starting STREAMING conversation for task:`, userQuery.substring(0, 100));
      
      // Initialize conversation state
      const conversationState = {
        originalTask: userQuery,
        completionScore: 0.0,
        conversationTurns: 0,
        taskProgress: [],
        finalResult: null
      };

      // Stream initial status
      this.streamProgress({
        type: 'agent_start',
        agent: this.agentName,
        specialization: this.specialization,
        status: `Starting ${this.agentName} conversation...`,
        completionScore: 0,
        timestamp: new Date().toISOString()
      }, context);

      // Start natural conversation loop with streaming
      while (conversationState.completionScore < this.completionThreshold && 
             conversationState.conversationTurns < this.maxConversationTurns) {
        
        conversationState.conversationTurns++;
        
        // Stream conversation turn start
        this.streamProgress({
          type: 'conversation_turn',
          agent: this.agentName,
          status: `Conversation turn ${conversationState.conversationTurns}/${this.maxConversationTurns}`,
          completionScore: Math.round((conversationState.conversationTurns / this.maxConversationTurns) * 30),
          turn: conversationState.conversationTurns,
          timestamp: new Date().toISOString()
        }, context);
        
        // Generate next prompt based on current progress
        const nextPrompt = this.generateNextPrompt(conversationState, context);
        
        // Stream LLM collaboration start
        this.streamProgress({
          type: 'llm_collaboration',
          agent: this.agentName,
          status: `Collaborating with LLM for ${this.specialization} expertise...`,
          completionScore: Math.round((conversationState.conversationTurns / this.maxConversationTurns) * 30) + 10,
          timestamp: new Date().toISOString()
        }, context);
        
        // Converse with LLM
        let llmResponse;
        if (conversationState.conversationTurns === 1) {
          // First conversation
          llmResponse = await this.llmAgent.collaborateWithAgent(
            this.agentName,
            nextPrompt,
            context
          );
        } else {
          // Continue conversation
          llmResponse = await this.llmAgent.continueConversation(
            this.agentName,
            nextPrompt,
            { ...context, conversationState }
          );
        }

        // Stream LLM response received
        this.streamProgress({
          type: 'llm_response',
          agent: this.agentName,
          status: `Received LLM response, analyzing progress...`,
          completionScore: Math.round((conversationState.conversationTurns / this.maxConversationTurns) * 30) + 20,
          responsePreview: llmResponse.response.substring(0, 150) + '...',
          timestamp: new Date().toISOString()
        }, context);

        // Analyze LLM response and update progress
        const progressAnalysis = await this.analyzeProgress(
          llmResponse, 
          conversationState, 
          context
        );
        
        conversationState.completionScore = progressAnalysis.completionScore;
        conversationState.taskProgress.push({
          turn: conversationState.conversationTurns,
          prompt: nextPrompt.substring(0, 200),
          response: llmResponse.response.substring(0, 500),
          completionScore: progressAnalysis.completionScore,
          missingElements: progressAnalysis.missingElements,
          timestamp: new Date().toISOString()
        });

        // Stream progress update
        this.streamProgress({
          type: 'progress_update',
          agent: this.agentName,
          status: `Progress: ${Math.round(progressAnalysis.completionScore * 100)}% complete`,
          completionScore: Math.round(progressAnalysis.completionScore * 100),
          turn: conversationState.conversationTurns,
          missingElements: progressAnalysis.missingElements,
          timestamp: new Date().toISOString()
        }, context);
        
        // Check if task is sufficiently complete
        if (progressAnalysis.completionScore >= this.completionThreshold) {
          this.streamProgress({
            type: 'task_complete',
            agent: this.agentName,
            status: `Task completed! (${Math.round(progressAnalysis.completionScore * 100)}%)`,
            completionScore: Math.round(progressAnalysis.completionScore * 100),
            timestamp: new Date().toISOString()
          }, context);
          
          conversationState.finalResult = llmResponse;
          break;
        }

        // Brief pause between conversation turns (prevent overwhelming LLM)
        await this.sleep(500);
      }

      // Stream final compilation
      this.streamProgress({
        type: 'final_compilation',
        agent: this.agentName,
        status: 'Compiling final response...',
        completionScore: 95,
        timestamp: new Date().toISOString()
      }, context);

      // Compile final response
      const finalResponse = this.compileFinalResponse(conversationState, context);
      
      // Stream completion
      this.streamProgress({
        type: 'agent_complete',
        agent: this.agentName,
        status: `${this.agentName} completed successfully!`,
        completionScore: 100,
        conversationTurns: conversationState.conversationTurns,
        timestamp: new Date().toISOString()
      }, context);

      return finalResponse;

    } catch (error) {
      logger.error(`❌ ${this.agentName} streaming execution error:`, error);
      
      // Stream error
      this.streamProgress({
        type: 'agent_error',
        agent: this.agentName,
        status: `Error: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      }, context);
      
      return this.getFallbackResponse(userQuery, error);
    }
  }

  /**
   * Stream progress updates to client
   */
  streamProgress(progressData, context) {
    if (context.streamingCallback) {
      try {
        context.streamingCallback(progressData);
        logger.info(`📡 ${this.agentName} Streaming sent: ${progressData.type} - ${progressData.status}`);
      } catch (error) {
        logger.error(`❌ ${this.agentName} Error in streaming callback:`, error);
      }
    } else {
      logger.warn(`⚠️ ${this.agentName} No streaming callback available in context`);
    }
    logger.info(`📡 ${this.agentName} Streaming: ${progressData.type} - ${progressData.status}`);
  }

  /**
   * Generate next prompt based on conversation progress
   */
  generateNextPrompt(conversationState, context) {
    const { conversationTurns, taskProgress, originalTask } = conversationState;
    
    if (conversationTurns === 1) {
      // Initial prompt
      return this.getInitialPrompt(originalTask, context);
    }
    
    // Continuation prompt based on what's missing
    const lastProgress = taskProgress[taskProgress.length - 1];
    const missingElements = lastProgress.missingElements || [];
    
    if (missingElements.length > 0) {
      return `Based on our previous discussion, I need you to address these missing elements: ${missingElements.join(', ')}. Please provide specific details for each missing component.`;
    }
    
    // General continuation
    return `Great progress! Now let's dive deeper and provide more specific implementation details. Focus on practical, actionable guidance that can be implemented immediately.`;
  }

  /**
   * Get initial prompt based on agent specialization
   */
  getInitialPrompt(task, context) {
    const basePrompt = `As a ${this.specialization}, I need your help with this task: "${task}"`;
    
    // Add specialization-specific context
    const specializationPrompts = {
      'Senior Project Manager': `${basePrompt}

Please provide comprehensive project planning including:
1. Project scope and requirements analysis
2. Timeline and milestone planning
3. Resource allocation and team structure
4. Risk assessment and mitigation strategies
5. Success metrics and deliverables

Focus on practical, actionable project management guidance.`,

      'Senior System Architect': `${basePrompt}

Please provide detailed system architecture including:
1. High-level system design and components
2. Technology stack recommendations
3. Scalability and performance considerations
4. Integration patterns and data flow
5. Security and compliance requirements

Focus on scalable, maintainable architecture design.`,

      'Database Architect': `${basePrompt}

Please provide comprehensive database design including:
1. Data model and entity relationships
2. Schema design and normalization
3. Indexing and query optimization strategies
4. Scalability and performance planning
5. Backup and disaster recovery

Focus on efficient, scalable database architecture.`,

      'API Architect': `${basePrompt}

Please provide detailed API design including:
1. RESTful endpoint structure and design
2. Authentication and authorization patterns
3. Rate limiting and security measures
4. Documentation and testing strategies
5. Integration and versioning approaches

Focus on robust, secure API architecture.`,

      'Senior Software Engineer': `${basePrompt}

Please provide comprehensive code implementation including:
1. Clean, well-structured code architecture
2. Error handling and validation
3. Testing strategies and implementation
4. Performance optimization
5. Documentation and maintainability

Focus on production-ready, maintainable code.`,

      'Technical Lead': `${basePrompt}

Please provide technical leadership guidance including:
1. Technical decision making and trade-offs
2. Code quality standards and reviews
3. Team coordination and mentoring
4. Architecture oversight and validation
5. Best practices implementation

Focus on technical excellence and team guidance.`
    };

    return specializationPrompts[this.specialization] || basePrompt;
  }

  /**
   * Analyze progress from LLM response
   */
  async analyzeProgress(llmResponse, conversationState, context) {
    try {
      // Use CPU models for progress analysis if available
      const progressScore = await this.calculateProgressScore(llmResponse, conversationState);
      const missingElements = await this.identifyMissingElements(llmResponse, conversationState);
      
      return {
        completionScore: progressScore,
        missingElements,
        analysis: `Turn ${conversationState.conversationTurns}: ${Math.round(progressScore * 100)}% complete`
      };
      
    } catch (error) {
      logger.error(`❌ Error analyzing progress for ${this.agentName}:`, error);
      
      // Fallback progress analysis
      const responseLength = llmResponse.response.length;
      const estimatedProgress = Math.min(
        (conversationState.conversationTurns * 0.2) + (responseLength / 2000 * 0.3),
        0.9
      );
      
      return {
        completionScore: estimatedProgress,
        missingElements: [],
        analysis: 'Fallback progress analysis'
      };
    }
  }

  /**
   * Calculate progress score based on response quality and completeness
   */
  async calculateProgressScore(llmResponse, conversationState) {
    const response = llmResponse.response;
    
    // Basic metrics
    const lengthScore = Math.min(response.length / 1500, 0.3); // Max 30% from length
    const structureScore = this.analyzeResponseStructure(response) * 0.2; // Max 20% from structure
    const contentScore = this.analyzeContentQuality(response) * 0.3; // Max 30% from content
    const turnBonus = Math.min(conversationState.conversationTurns * 0.05, 0.2); // Max 20% from turns
    
    return Math.min(lengthScore + structureScore + contentScore + turnBonus, 0.95);
  }

  /**
   * Analyze response structure (headings, lists, organization)
   */
  analyzeResponseStructure(response) {
    let score = 0;
    
    // Check for numbered lists
    if (response.match(/\d+\./g)) score += 0.3;
    
    // Check for bullet points
    if (response.match(/[-•]/g)) score += 0.2;
    
    // Check for headings/sections
    if (response.match(/#{1,3}\s/g) || response.match(/\*\*[^*]+\*\*/g)) score += 0.3;
    
    // Check for code blocks
    if (response.match(/```[\s\S]*?```/g)) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Analyze content quality based on keywords and depth
   */
  analyzeContentQuality(response) {
    const qualityKeywords = [
      'implementation', 'architecture', 'design', 'strategy', 'approach',
      'solution', 'requirements', 'specifications', 'details', 'structure',
      'framework', 'methodology', 'best practices', 'optimization',
      'security', 'performance', 'scalability', 'maintainability'
    ];
    
    const lowerResponse = response.toLowerCase();
    const keywordMatches = qualityKeywords.filter(keyword => 
      lowerResponse.includes(keyword)
    ).length;
    
    return Math.min(keywordMatches / qualityKeywords.length, 1.0);
  }

  /**
   * Identify missing elements from the response
   */
  async identifyMissingElements(llmResponse, conversationState) {
    const response = llmResponse.response;
    const missingElements = [];
    
    // Check for common missing elements based on agent type
    const requiredElements = this.getRequiredElements();
    
    for (const element of requiredElements) {
      if (!this.elementPresent(response, element)) {
        missingElements.push(element);
      }
    }
    
    return missingElements.slice(0, 3); // Limit to top 3 missing elements
  }

  /**
   * Get required elements based on agent specialization
   */
  getRequiredElements() {
    const elementsBySpecialization = {
      'Senior Project Manager': ['timeline', 'milestones', 'resources', 'risks', 'deliverables'],
      'Senior System Architect': ['components', 'technology stack', 'scalability', 'integration', 'security'],
      'Database Architect': ['schema', 'relationships', 'indexing', 'performance', 'backup'],
      'API Architect': ['endpoints', 'authentication', 'documentation', 'testing', 'versioning'],
      'Senior Software Engineer': ['code structure', 'error handling', 'testing', 'documentation', 'optimization'],
      'Technical Lead': ['standards', 'reviews', 'mentoring', 'architecture', 'best practices']
    };
    
    return elementsBySpecialization[this.specialization] || ['implementation', 'structure', 'documentation'];
  }

  /**
   * Check if element is present in response
   */
  elementPresent(response, element) {
    const lowerResponse = response.toLowerCase();
    const lowerElement = element.toLowerCase();
    
    // Direct keyword match
    if (lowerResponse.includes(lowerElement)) return true;
    
    // Synonym matching
    const synonyms = {
      'timeline': ['schedule', 'timeframe', 'duration', 'deadline'],
      'milestones': ['phases', 'stages', 'checkpoints', 'goals'],
      'resources': ['team', 'budget', 'personnel', 'allocation'],
      'risks': ['challenges', 'issues', 'problems', 'concerns'],
      'deliverables': ['outputs', 'results', 'products', 'outcomes']
    };
    
    const elementSynonyms = synonyms[lowerElement] || [];
    return elementSynonyms.some(synonym => lowerResponse.includes(synonym));
  }

  /**
   * Compile final response from conversation
   */
  compileFinalResponse(conversationState, context) {
    const { finalResult, taskProgress, completionScore, conversationTurns } = conversationState;
    
    return {
      content: finalResult ? finalResult.response : this.generateSummaryFromProgress(taskProgress),
      analysis: `Natural conversation completed in ${conversationTurns} turns with ${Math.round(completionScore * 100)}% completion`,
      suggestions: finalResult ? finalResult.nextSteps || [] : [],
      conversationalFlow: true,
      metadata: {
        agentType: this.agentName,
        specialization: this.specialization,
        conversationTurns,
        finalCompletionScore: completionScore,
        conversationHistory: taskProgress.map(turn => ({
          turn: turn.turn,
          completionScore: turn.completionScore,
          timestamp: turn.timestamp
        }))
      }
    };
  }

  /**
   * Generate summary from conversation progress
   */
  generateSummaryFromProgress(taskProgress) {
    if (taskProgress.length === 0) {
      return 'Conversation completed but no progress recorded.';
    }
    
    const lastTurn = taskProgress[taskProgress.length - 1];
    return `**${this.specialization} Analysis Summary**

${lastTurn.response}

*This response was generated through ${taskProgress.length} turns of natural conversation with AI to ensure comprehensive coverage.*`;
  }

  /**
   * Get fallback response when conversation fails
   */
  getFallbackResponse(userQuery = '', error) {
    const queryPreview = typeof userQuery === 'string' ? userQuery.substring(0, 50) : '';
    return {
      content: `As your ${this.specialization}, I encountered an issue during our conversation but I'm here to help! ${queryPreview ? `For "${queryPreview}...", ` : ''}I recommend breaking this down into manageable components and addressing each systematically.`,
      analysis: `Fallback response due to conversation error: ${error.message}`,
      suggestions: [
        'Try rephrasing the request with more specific details',
        'Break down the task into smaller components',
        'Provide additional context about requirements'
      ],
      conversationalFlow: false,
      fallback: true
    };
  }

  /**
   * Sleep utility for conversation pacing
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 