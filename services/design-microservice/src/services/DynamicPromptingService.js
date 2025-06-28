import logger from '../utils/logger.js';

/**
 * Dynamic Prompting Service - Phase 3 Implementation
 * Handles context-aware prompt generation, optimization, and adaptive responses
 */
class DynamicPromptingService {
  constructor() {
    this.promptTemplates = new Map();
    this.contextCache = new Map();
    this.userProfiles = new Map();
    this.promptHistory = new Map();
    this.optimizationRules = new Map();
    
    this.initializeTemplates();
    this.initializeOptimizationRules();
  }

  /**
   * Initialize dynamic prompt templates for different scenarios
   */
  initializeTemplates() {
    // Context-aware prompts
    this.promptTemplates.set('context-aware', {
      analysis: `You are an expert {agentRole} analyzing a {taskType} request.
      
      CONTEXT AWARENESS:
      - User Experience Level: {userLevel}
      - Project Type: {projectType}
      - Current Architecture: {architectureType}
      - Previous Successful Patterns: {successPatterns}
      - Performance Requirements: {performanceNeeds}
      
      TASK: {taskContent}
      
      ADAPTATION STRATEGY:
      - For beginners: Provide step-by-step explanations with examples
      - For experts: Give concise recommendations with trade-offs
      - Consider established patterns in this project
      - Optimize for the current technology stack
      
      Please provide contextually appropriate analysis.`,
      
      implementation: `As a specialized {agentRole}, implement the following requirements:
      
      CONTEXTUAL FACTORS:
      - Existing codebase patterns: {codePatterns}
      - Team preferences: {teamPreferences}
      - Performance constraints: {constraints}
      - Integration requirements: {integrations}
      
      REQUIREMENTS: {requirements}
      
      IMPLEMENTATION FOCUS:
      - Maintain consistency with existing architecture
      - Follow established coding patterns
      - Consider scalability and maintainability
      - Ensure proper error handling and testing
      
      Generate production-ready implementation.`
    });

    // Inter-agent communication prompts
    this.promptTemplates.set('inter-agent', {
      collaboration: `INTER-AGENT COLLABORATION REQUEST
      
      FROM: {sourceAgent}
      TO: {targetAgent}
      TASK: {collaborationTask}
      
      SHARED CONTEXT:
      {sharedContext}
      
      PREVIOUS AGENTS' OUTPUTS:
      {previousOutputs}
      
      COORDINATION REQUIREMENTS:
      - Build upon previous agent work
      - Maintain consistency across agents
      - Resolve any conflicts or gaps
      - Ensure smooth handoff to next agent
      
      Your specialized contribution: {specificContribution}`,
      
      validation: `VALIDATION REQUEST FROM {requestingAgent}
      
      VALIDATION TARGET: {validationTarget}
      VALIDATION CRITERIA: {criteria}
      
      PREVIOUS CONTEXT:
      {previousContext}
      
      VALIDATION FOCUS:
      - Technical accuracy and feasibility
      - Consistency with project requirements
      - Integration compatibility
      - Security and performance implications
      
      Provide detailed validation feedback.`
    });

    // User interaction prompts
    this.promptTemplates.set('user-interaction', {
      clarification: `CLARIFICATION REQUEST
      
      CONTEXT: The user request requires additional information for optimal implementation.
      
      USER REQUEST: {userRequest}
      CURRENT UNDERSTANDING: {currentUnderstanding}
      MISSING INFORMATION: {missingInfo}
      
      QUESTION STRATEGY:
      - Ask 2-3 most important questions
      - Provide multiple choice options when possible
      - Explain why each question matters
      - Suggest reasonable defaults
      
      Generate focused clarification questions.`,
      
      feedback: `USER FEEDBACK INTEGRATION
      
      ORIGINAL OUTPUT: {originalOutput}
      USER FEEDBACK: {userFeedback}
      SATISFACTION LEVEL: {satisfactionLevel}
      
      IMPROVEMENT REQUIREMENTS:
      - Address specific user concerns
      - Maintain what worked well
      - Enhance areas of dissatisfaction
      - Adapt to user preferences
      
      Generate improved response based on feedback.`
    });

    // Error handling prompts
    this.promptTemplates.set('error-handling', {
      recovery: `ERROR RECOVERY SCENARIO
      
      ERROR TYPE: {errorType}
      ERROR CONTEXT: {errorContext}
      FAILURE POINT: {failurePoint}
      
      RECOVERY STRATEGY:
      - Analyze root cause of failure
      - Propose alternative approaches
      - Maintain progress where possible
      - Prevent similar future errors
      
      FALLBACK OPTIONS:
      {fallbackOptions}
      
      Generate recovery plan and alternative implementation.`,
      
      validation: `ERROR PREVENTION VALIDATION
      
      PROPOSED SOLUTION: {proposedSolution}
      RISK FACTORS: {riskFactors}
      VALIDATION CHECKPOINTS: {checkpoints}
      
      VALIDATION REQUIREMENTS:
      - Identify potential failure points
      - Suggest mitigation strategies
      - Recommend testing approaches
      - Ensure graceful degradation
      
      Provide comprehensive validation assessment.`
    });
  }

  /**
   * Initialize optimization rules for different scenarios
   */
  initializeOptimizationRules() {
    this.optimizationRules.set('token-optimization', {
      compress: (prompt) => {
        // Remove redundant phrases
        return prompt
          .replace(/\b(please|kindly|if you would|could you)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      },
      prioritize: (sections) => {
        // Prioritize sections by importance
        const priority = ['task', 'context', 'requirements', 'examples'];
        return sections.sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));
      }
    });

    this.optimizationRules.set('context-optimization', {
      filterRelevant: (context, task) => {
        // Filter context based on task relevance
        const relevanceScore = this.calculateRelevanceScore(context, task);
        return context.filter(item => relevanceScore[item.id] > 0.5);
      },
      rankByImportance: (contextItems) => {
        // Rank context items by importance
        return contextItems.sort((a, b) => b.importance - a.importance);
      }
    });
  }

  /**
   * Generate context-aware prompt based on user profile and task
   */
  async generateContextAwarePrompt(agent, task, userProfile, projectContext) {
    try {
      const templateKey = this.determineTemplateKey(task.type);
      const template = this.promptTemplates.get('context-aware')[templateKey];
      
      if (!template) {
        logger.warn(`No template found for task type: ${task.type}`);
        return this.generateFallbackPrompt(agent, task);
      }

      // Build context variables
      const contextVars = {
        agentRole: agent.name,
        taskType: task.type,
        taskContent: task.content,
        userLevel: userProfile.experienceLevel || 'intermediate',
        projectType: projectContext.type || 'web-application',
        architectureType: projectContext.architecture || 'microservices',
        successPatterns: this.getUserSuccessPatterns(userProfile),
        performanceNeeds: projectContext.performanceRequirements || 'standard',
        codePatterns: projectContext.codePatterns || [],
        teamPreferences: projectContext.teamPreferences || {},
        constraints: projectContext.constraints || [],
        integrations: projectContext.integrations || [],
        requirements: task.requirements || []
      };

      // Generate and optimize prompt
      let prompt = this.interpolateTemplate(template, contextVars);
      prompt = await this.optimizePrompt(prompt, agent, task);
      
      // Cache for future optimization
      this.cachePrompt(agent.id, task.type, prompt, contextVars);
      
      return prompt;
    } catch (error) {
      logger.error('Error generating context-aware prompt:', error);
      return this.generateFallbackPrompt(agent, task);
    }
  }

  /**
   * Generate inter-agent communication prompt
   */
  async generateInterAgentPrompt(sourceAgent, targetAgent, collaborationTask, sharedContext) {
    try {
      const template = this.promptTemplates.get('inter-agent').collaboration;
      
      const contextVars = {
        sourceAgent: sourceAgent.name,
        targetAgent: targetAgent.name,
        collaborationTask: collaborationTask.description,
        sharedContext: JSON.stringify(sharedContext, null, 2),
        previousOutputs: this.formatPreviousOutputs(sharedContext.previousOutputs),
        specificContribution: this.defineSpecificContribution(targetAgent, collaborationTask)
      };

      const prompt = this.interpolateTemplate(template, contextVars);
      return await this.optimizePrompt(prompt, targetAgent, collaborationTask);
    } catch (error) {
      logger.error('Error generating inter-agent prompt:', error);
      throw error;
    }
  }

  /**
   * Generate user interaction prompt for clarifications
   */
  async generateUserInteractionPrompt(task, currentUnderstanding, missingInfo) {
    try {
      const template = this.promptTemplates.get('user-interaction').clarification;
      
      const contextVars = {
        userRequest: task.originalRequest,
        currentUnderstanding: JSON.stringify(currentUnderstanding, null, 2),
        missingInfo: missingInfo.join(', ')
      };

      const prompt = this.interpolateTemplate(template, contextVars);
      return await this.optimizePromptForUserInteraction(prompt);
    } catch (error) {
      logger.error('Error generating user interaction prompt:', error);
      throw error;
    }
  }

  /**
   * Generate error handling prompt
   */
  async generateErrorHandlingPrompt(errorType, errorContext, failurePoint, fallbackOptions) {
    try {
      const template = this.promptTemplates.get('error-handling').recovery;
      
      const contextVars = {
        errorType,
        errorContext: JSON.stringify(errorContext, null, 2),
        failurePoint,
        fallbackOptions: fallbackOptions.join('\n- ')
      };

      const prompt = this.interpolateTemplate(template, contextVars);
      return await this.optimizePrompt(prompt, null, { type: 'error-recovery' });
    } catch (error) {
      logger.error('Error generating error handling prompt:', error);
      throw error;
    }
  }

  /**
   * Generate validation prompt
   */
  async generateValidationPrompt(requestingAgent, validationTarget, criteria, previousContext) {
    try {
      const template = this.promptTemplates.get('inter-agent').validation;
      
      const contextVars = {
        requestingAgent: requestingAgent.name,
        validationTarget: JSON.stringify(validationTarget, null, 2),
        criteria: criteria.join('\n- '),
        previousContext: JSON.stringify(previousContext, null, 2)
      };

      const prompt = this.interpolateTemplate(template, contextVars);
      return await this.optimizePrompt(prompt, null, { type: 'validation' });
    } catch (error) {
      logger.error('Error generating validation prompt:', error);
      throw error;
    }
  }

  /**
   * Optimize prompt for token efficiency and model compatibility
   */
  async optimizePrompt(prompt, agent, task) {
    try {
      // Token optimization
      const tokenOptimizer = this.optimizationRules.get('token-optimization');
      let optimizedPrompt = tokenOptimizer.compress(prompt);

      // Context optimization
      const contextOptimizer = this.optimizationRules.get('context-optimization');
      
      // Model-specific optimization
      if (agent && agent.model) {
        optimizedPrompt = await this.optimizeForModel(optimizedPrompt, agent.model);
      }

      // Length optimization
      optimizedPrompt = await this.optimizeLength(optimizedPrompt, agent);

      return optimizedPrompt;
    } catch (error) {
      logger.error('Error optimizing prompt:', error);
      return prompt; // Return original if optimization fails
    }
  }

  /**
   * Optimize prompt specifically for user interaction
   */
  async optimizePromptForUserInteraction(prompt) {
    // Make prompts more user-friendly
    return prompt
      .replace(/REQUIREMENTS:/g, 'To help you better, I need to know:')
      .replace(/VALIDATION:/g, 'Let me make sure I understand:')
      .replace(/CONTEXT:/g, 'Based on what you\'ve told me:');
  }

  /**
   * Helper methods
   */
  interpolateTemplate(template, variables) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  determineTemplateKey(taskType) {
    const typeMapping = {
      'analysis': 'analysis',
      'code-generation': 'implementation',
      'architecture': 'analysis',
      'database': 'implementation',
      'api': 'implementation',
      'security': 'analysis'
    };
    return typeMapping[taskType] || 'analysis';
  }

  getUserSuccessPatterns(userProfile) {
    return userProfile.successfulPatterns || [
      'step-by-step implementation',
      'clear documentation',
      'modular architecture'
    ];
  }

  formatPreviousOutputs(previousOutputs) {
    if (!previousOutputs || previousOutputs.length === 0) {
      return 'No previous outputs available.';
    }
    
    return previousOutputs.map(output => 
      `${output.agent}: ${output.summary || output.content.substring(0, 200)}...`
    ).join('\n\n');
  }

  defineSpecificContribution(agent, task) {
    const contributions = {
      'Architecture Designer': 'Design system architecture and component relationships',
      'Database Designer': 'Design data models and database schemas',
      'API Designer': 'Design REST/GraphQL APIs and documentation',
      'Security Analyst': 'Analyze security requirements and implement safeguards',
      'Code Generator': 'Generate production-ready code implementations'
    };
    return contributions[agent.name] || 'Provide specialized expertise for this task';
  }

  async optimizeForModel(prompt, modelName) {
    // Model-specific optimizations
    const modelOptimizations = {
      'gemini-pro': {
        maxTokens: 30000,
        preferredFormat: 'structured',
        supportMarkdown: true
      },
      'gemini-flash': {
        maxTokens: 1000000,
        preferredFormat: 'concise',
        supportMarkdown: true
      }
    };

    const config = modelOptimizations[modelName];
    if (!config) return prompt;

    // Apply model-specific optimizations
    if (config.preferredFormat === 'concise') {
      prompt = prompt.replace(/\n\s*\n/g, '\n').trim();
    }

    return prompt;
  }

  async optimizeLength(prompt, agent) {
    const maxLength = agent?.maxPromptLength || 8000;
    if (prompt.length <= maxLength) return prompt;

    // Intelligent truncation - keep most important parts
    const sections = prompt.split('\n\n');
    const importantSections = sections.filter(section => 
      section.includes('TASK:') || 
      section.includes('REQUIREMENTS:') ||
      section.includes('CONTEXT:')
    );

    return importantSections.join('\n\n');
  }

  calculateRelevanceScore(context, task) {
    // Implementation of relevance scoring algorithm
    const scores = {};
    context.forEach(item => {
      scores[item.id] = Math.random(); // Placeholder - implement actual scoring
    });
    return scores;
  }

  cachePrompt(agentId, taskType, prompt, contextVars) {
    const cacheKey = `${agentId}-${taskType}`;
    this.promptHistory.set(cacheKey, {
      prompt,
      contextVars,
      timestamp: Date.now()
    });
  }

  generateFallbackPrompt(agent, task) {
    return `${agent.systemPrompt || `You are ${agent.name}`}

TASK: ${task.type}
REQUEST: ${task.content}

Please provide a comprehensive analysis and recommendations for this request.`;
  }

  /**
   * Get prompt optimization statistics
   */
  getOptimizationStats() {
    return {
      totalPrompts: this.promptHistory.size,
      templateTypes: Array.from(this.promptTemplates.keys()),
      optimizationRules: Array.from(this.optimizationRules.keys()),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  calculateCacheHitRate() {
    // Placeholder implementation
    return 0.75; // 75% cache hit rate
  }

  async generateResponse(prompt, context) {
    try {
      logger.info('Generating response for prompt:', prompt);
      // TODO: Implement dynamic prompting logic
      return { response: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error generating response:', error);
      throw error;
    }
  }

  async analyzePrompt(prompt, context) {
    try {
      logger.info('Analyzing prompt:', prompt);
      // TODO: Implement prompt analysis logic
      return { analysis: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error analyzing prompt:', error);
      throw error;
    }
  }
}

export default DynamicPromptingService; 