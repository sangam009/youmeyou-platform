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
        finalResult: null,
        subTasks: [],
        currentSubTask: null
      };

      // Initial task analysis to break into subtasks
      const taskAnalysis = await this.llmAgent.analyzeTask(userQuery, {
        ...context,
        agentName: this.agentName,
        specialization: this.specialization
      });

      conversationState.subTasks = taskAnalysis.subTasks || [];
      
      // Start natural conversation loop
      while (conversationState.completionScore < this.completionThreshold && 
             conversationState.conversationTurns < this.maxConversationTurns) {
        
        conversationState.conversationTurns++;
        logger.info(`💬 ${this.agentName} - Conversation turn ${conversationState.conversationTurns}`);
        
        // Select next subtask if needed
        if (!conversationState.currentSubTask && conversationState.subTasks.length > 0) {
          conversationState.currentSubTask = conversationState.subTasks.shift();
        }

        // Generate next prompt based on current progress
        const nextPrompt = await this.generateNextPrompt(conversationState, context);
        
        // Log the generated prompt for this conversation turn
        logger.info(`📝 [CONVERSATIONAL AGENT] Generated prompt for turn ${conversationState.conversationTurns}:`, {
          agentName: this.agentName,
          turn: conversationState.conversationTurns,
          promptLength: nextPrompt.length,
          fullPrompt: nextPrompt
        });
        
        // Converse with LLM
        let llmResponse;
        if (conversationState.conversationTurns === 1) {
          // First conversation
          logger.info(`🤝 [CONVERSATIONAL AGENT] Starting first collaboration with LLM for ${this.agentName}`);
          llmResponse = await this.llmAgent.collaborateWithAgent(
            this.agentName,
            nextPrompt,
            context
          );
        } else {
          // Continue conversation with context
          logger.info(`💬 [CONVERSATIONAL AGENT] Continuing conversation turn ${conversationState.conversationTurns} for ${this.agentName}`);
          llmResponse = await this.llmAgent.continueConversation(
            this.agentName,
            nextPrompt,
            { 
              ...context, 
              conversationState,
              previousResponses: conversationState.taskProgress.map(p => p.response)
            }
          );
        }
        
        // Log the LLM response for this conversation turn
        logger.info(`📄 [CONVERSATIONAL AGENT] Received LLM response for turn ${conversationState.conversationTurns}:`, {
          agentName: this.agentName,
          turn: conversationState.conversationTurns,
          responseLength: llmResponse.response?.length || 0,
          fullResponse: llmResponse.response || llmResponse.content || 'No response content'
        });

        // Extract and validate any actions from LLM response
        const actions = await this.extractActions(llmResponse.response);
        if (actions.length > 0) {
          await this.executeActions(actions, context);
        }

        // Analyze LLM response and update progress
        const progressAnalysis = await this.analyzeProgress(
          llmResponse, 
          conversationState, 
          context
        );
        
        // Update conversation state
        conversationState.completionScore = progressAnalysis.completionScore;
        conversationState.taskProgress.push({
          turn: conversationState.conversationTurns,
          prompt: nextPrompt,
          response: llmResponse.response,
          completionScore: progressAnalysis.completionScore,
          missingElements: progressAnalysis.missingElements,
          actions: actions,
          timestamp: new Date().toISOString()
        });

        // Mark subtask as complete if threshold met
        if (conversationState.currentSubTask && progressAnalysis.completionScore >= 0.8) {
          conversationState.currentSubTask.completed = true;
          conversationState.currentSubTask = null;
        }

        // Brief pause between turns
        await this.sleep(500);
      }

      // Compile final response
      return this.compileFinalResponse(conversationState, context);

    } catch (error) {
      logger.error(`❌ ${this.agentName} execution error:`, error);
      return this.getFallbackResponse(userQuery, error);
    }
  }

  /**
   * Stream progress updates to client
   */
  streamProgress(progressData, context) {
    if (context.streamingCallback) {
      context.streamingCallback({
        ...progressData,
        agent: this.agentName,
        timestamp: new Date().toISOString()
      });
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
        status: `Starting ${this.agentName} conversation...`,
        completionScore: 0
      }, context);

      // Generate initial prompt
      const prompt = await this.generateNextPrompt(conversationState, context);

      // Execute LLM request with streaming
      const response = await this.llmAgent.execute(prompt, {
        ...context,
        streamingEnabled: true,
        streamingCallback: (chunk) => {
          this.streamProgress({
            type: 'llm_chunk',
            content: chunk.content,
            completionScore: Math.min(100, conversationState.completionScore + 10)
          }, context);
        }
      });

      // Stream completion
      this.streamProgress({
        type: 'agent_complete',
        status: 'Conversation complete',
        completionScore: 100,
        finalResponse: response.content
      }, context);

      return {
        content: response.content,
        type: 'streaming_conversation',
        metadata: {
          agentName: this.agentName,
          completionScore: 100,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`❌ ${this.agentName} streaming execution error:`, error);
      
      // Stream error status
      this.streamProgress({
        type: 'agent_error',
        status: 'Error in conversation',
        error: error.message
      }, context);
      
      return this.getFallbackResponse(userQuery, error);
    }
  }

  /**
   * Generate next conversation prompt based on state
   */
  async generateNextPrompt(conversationState, context) {
    const { DynamicPromptGenerationService } = await import('../DynamicPromptGenerationService.js');
    const promptGenerator = new DynamicPromptGenerationService();

    if (conversationState.currentSubTask) {
      // Working on specific subtask
      return promptGenerator.getSubTaskPrompt(
        conversationState.currentSubTask,
        conversationState.taskProgress,
        this.specialization
      );
    }

    // Generate prompt for next step
    return promptGenerator.getNextStepPrompt(
      conversationState.originalTask,
      conversationState.taskProgress,
      this.specialization
    );
  }

  /**
   * Extract actions from LLM response
   */
  async extractActions(response) {
    try {
      // Look for action blocks in response
      const actionBlocks = response.match(/```action[\s\S]*?```/g) || [];
      
      return actionBlocks.map(block => {
        const actionContent = block.replace(/```action|```/g, '').trim();
        try {
          return JSON.parse(actionContent);
        } catch (e) {
          logger.warn('Invalid action block format:', actionContent);
          return null;
        }
      }).filter(action => action !== null);

    } catch (error) {
      logger.error('Error extracting actions:', error);
      return [];
    }
  }

  /**
   * Execute extracted actions
   */
  async executeActions(actions, context) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'update_canvas':
            await this.executeCanvasUpdate(action, context);
            break;
          case 'create_file':
            await this.executeFileCreation(action, context);
            break;
          case 'update_database':
            await this.executeDatabaseUpdate(action, context);
            break;
          default:
            logger.warn('Unknown action type:', action.type);
        }
      } catch (error) {
        logger.error(`Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute canvas update action
   */
  async executeCanvasUpdate(action, context) {
    try {
      const { canvasService } = await import('../canvasService.js');
      await canvasService.updateCanvas(context.projectId, action.elements);
    } catch (error) {
      logger.error('Canvas update failed:', error);
    }
  }

  /**
   * Execute file creation action
   */
  async executeFileCreation(action, context) {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(action.path, action.content);
    } catch (error) {
      logger.error('File creation failed:', error);
    }
  }

  /**
   * Execute database update action
   */
  async executeDatabaseUpdate(action, context) {
    try {
      const { dbService } = await import('../dbService.js');
      await dbService.executeUpdate(action.query, action.params);
    } catch (error) {
      logger.error('Database update failed:', error);
    }
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