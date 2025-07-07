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
    const conversationId = `conv-${Date.now()}`;
    logger.info(`🎯 Starting conversation with ${this.agentName}:`, {
      conversationId,
      query: userQuery,
      agentName: this.agentName,
      specialization: this.specialization
    });

    // Initialize conversation state
    const conversationState = {
      conversationTurns: 0,
      completionScore: 0,
      subTasks: await this.identifySubTasks(userQuery),
      currentSubTask: null,
      taskProgress: []
    };

    logger.info('📋 Initial conversation state:', {
      conversationId,
      subTaskCount: conversationState.subTasks.length,
      subTasks: conversationState.subTasks
    });
    
    // Start natural conversation loop
    while (conversationState.completionScore < this.completionThreshold && 
           conversationState.conversationTurns < this.maxConversationTurns) {
      
      conversationState.conversationTurns++;
      logger.info(`💬 ${this.agentName} - Starting conversation turn ${conversationState.conversationTurns}:`, {
        conversationId,
        turn: conversationState.conversationTurns,
        completionScore: conversationState.completionScore
      });
      
      // Select next subtask if needed
      if (!conversationState.currentSubTask && conversationState.subTasks.length > 0) {
        conversationState.currentSubTask = conversationState.subTasks.shift();
        logger.info('📌 Selected next subtask:', {
          conversationId,
          turn: conversationState.conversationTurns,
          subtask: conversationState.currentSubTask
        });
      }

      // Generate next prompt based on current progress
      const nextPrompt = await this.generateNextPrompt(conversationState, context);
      logger.info('📝 Generated prompt for LLM:', {
        conversationId,
        turn: conversationState.conversationTurns,
        prompt: nextPrompt,
        context: {
          currentSubtask: conversationState.currentSubTask,
          completionScore: conversationState.completionScore,
          remainingSubtasks: conversationState.subTasks.length
        }
      });
      
      // Converse with LLM
      let llmResponse;
      if (conversationState.conversationTurns === 1) {
        // First conversation
        logger.info('🤖 Starting initial LLM conversation:', {
          conversationId,
          turn: conversationState.conversationTurns,
          agentName: this.agentName
        });

        llmResponse = await this.llmAgent.collaborateWithAgent(
          this.agentName,
          nextPrompt,
          context
        );
      } else {
        // Continue conversation with context
        logger.info('🔄 Continuing LLM conversation:', {
          conversationId,
          turn: conversationState.conversationTurns,
          agentName: this.agentName,
          previousTurns: conversationState.taskProgress.length
        });

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

      logger.info('📥 Received LLM response:', {
        conversationId,
        turn: conversationState.conversationTurns,
        responseLength: llmResponse.response.length,
        response: llmResponse.response,
        analysis: llmResponse.analysis,
        suggestions: llmResponse.suggestions
      });

      // Extract and validate any actions from LLM response
      const actions = await this.extractActions(llmResponse.response);
      if (actions.length > 0) {
        logger.info('🎯 Extracted actions from response:', {
          conversationId,
          turn: conversationState.conversationTurns,
          actionCount: actions.length,
          actions: actions.map(a => ({
            type: a.type,
            description: a.description
          }))
        });

        await this.executeActions(actions, context);
      }

      // Analyze LLM response and update progress
      const progressAnalysis = await this.analyzeProgress(
        llmResponse, 
        conversationState, 
        context
      );
      
      logger.info('📊 Progress analysis:', {
        conversationId,
        turn: conversationState.conversationTurns,
        completionScore: progressAnalysis.completionScore,
        missingElements: progressAnalysis.missingElements,
        nextSteps: progressAnalysis.nextSteps
      });

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
    }

    logger.info('✅ Conversation completed:', {
      conversationId,
      totalTurns: conversationState.conversationTurns,
      finalCompletionScore: conversationState.completionScore,
      taskProgress: conversationState.taskProgress.map(p => ({
        turn: p.turn,
        completionScore: p.completionScore,
        actionCount: p.actions.length,
        timestamp: p.timestamp
      }))
    });

    return {
      response: conversationState.taskProgress[conversationState.taskProgress.length - 1].response,
      conversationTurns: conversationState.conversationTurns,
      completionScore: conversationState.completionScore,
      taskProgress: conversationState.taskProgress
    };
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
        const nextPrompt = await this.generateNextPrompt(conversationState, context);
        
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