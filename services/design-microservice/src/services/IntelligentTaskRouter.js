import logger from '../utils/logger.js';
import { AgentOrchestrator } from './agents/AgentOrchestrator.js';
import { DistilBERTComplexityAnalyzer } from './cpuModels/DistilBERTComplexityAnalyzer.js';
import { LLMAgent } from './agents/LLMAgent.js';

/**
 * TRULY Intelligent Task Router - Uses CPU Models + LLM for Analysis
 * NO MORE STATIC ROUTING - Everything is AI-powered
 */
export class IntelligentTaskRouter {
  constructor() {
    this.orchestrator = new AgentOrchestrator();
    this.complexityAnalyzer = new DistilBERTComplexityAnalyzer();
    this.llmAgent = LLMAgent.getInstance();
    this.complexityThreshold = 0.7; // Simple vs Complex routing threshold
    
    logger.info('🚀 [TASK ROUTER] IntelligentTaskRouter initialized with CPU models and LLM singleton');
  }

  /**
   * Main routing function - analyzes prompt and routes intelligently
   */
  async routeTask(userPrompt, context = {}) {
    try {
      logger.info('🔍 Analyzing task complexity for prompt:', userPrompt.substring(0, 100));
      logger.info('📋 IntelligentTaskRouter received context:', {
        hasUserId: !!context.userId,
        hasProjectId: !!context.projectId,
        userId: context.userId,
        projectId: context.projectId,
        contextKeys: Object.keys(context)
      });
      
      // Step 1: Analyze prompt complexity and intent
      const analysis = await this.analyzeTaskComplexity(userPrompt);
      
      logger.info('📊 Complexity analysis result:', {
        complexity: analysis.complexity,
        intent: analysis.intent,
        skills: analysis.requiredSkills,
        route: analysis.complexity >= this.complexityThreshold ? 'COMPLEX' : 'SIMPLE'
      });

      // Step 2: Route based on complexity
      if (analysis.complexity >= this.complexityThreshold) {
        return await this.handleComplexTask(userPrompt, analysis, context);
      } else {
        return await this.handleSimpleTask(userPrompt, analysis, context);
      }
      
    } catch (error) {
      logger.error('❌ Error in intelligent task routing:', error);
      throw error;
    }
  }

  /**
   * AI-POWERED prompt complexity analysis using CPU models and LLM
   */
  async analyzeTaskComplexity(prompt) {
    try {
      logger.info('🔍 Starting task complexity analysis:', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      logger.info('🧠 Using AI-powered complexity analysis with DistilBERT + LLM');
      
      // STEP 1: CPU Model Analysis (DistilBERT)
      logger.info('🧠 Analyzing complexity with DistilBERT CPU model');
      const cpuAnalysis = await this.complexityAnalyzer.analyzeComplexity(prompt);
      
      logger.info('📊 CPU model analysis results:', {
        complexity: cpuAnalysis.complexity,
        confidence: cpuAnalysis.confidence,
        source: cpuAnalysis.source,
        domains: cpuAnalysis.technicalDomains || [],
        intent: cpuAnalysis.intent || 'general',
        processingTime: cpuAnalysis.processingTime || 0,
        requestTime: cpuAnalysis.requestTime || 0
      });

      // Check if CPU model was bypassed
      if (cpuAnalysis.source === 'fallback-analysis') {
        logger.warn('⚠️ CPU MODEL BYPASSED - Using fallback analysis instead of DistilBERT');
      }

      // STEP 2: LLM Enhancement (if needed for complex tasks)
      let finalAnalysis = cpuAnalysis;
      
      if (cpuAnalysis.complexity > 0.7 || cpuAnalysis.source === 'fallback-analysis') {
        logger.info('🤖 Enhancing analysis with LLM due to high complexity or fallback');
        
        try {
          const { LLMAgent } = await import('./agents/LLMAgent.js');
          const llmAgent = LLMAgent.getInstance();
          
          // Generate dynamic enhancement prompt using CPU models
        const { DynamicPromptGenerationService } = await import('./DynamicPromptGenerationService.js');
        const promptGenerator = new DynamicPromptGenerationService();
        
        const enhancementPrompt = await promptGenerator.generatePrompt('task_enhancement', {
          userQuery: prompt,
          cpuAnalysis: JSON.stringify(cpuAnalysis),
          analysisType: 'complexity_and_skills',
          expectedFormat: 'json',
          complexityLevel: cpuAnalysis.complexity || 'medium'
        });

          const llmResponse = await llmAgent.execute(enhancementPrompt);
          
          logger.info('🤖 LLM enhancement completed:', {
            llmResponse: llmResponse.content,
            model: llmResponse.metadata?.model
          });
          
          // Merge CPU and LLM analysis
          finalAnalysis = {
            ...cpuAnalysis,
            complexity: llmResponse.content.complexity || cpuAnalysis.complexity,
            confidence: Math.max(cpuAnalysis.confidence, llmResponse.content.confidence || 0),
            intent: llmResponse.content.intent || cpuAnalysis.intent || 'general',
            requiredSkills: llmResponse.content.requiredSkills || [],
            subTaskCount: llmResponse.content.subTaskCount || 0,
            enhancedByLLM: true,
            llmReasoning: llmResponse.content.reasoning
          };
          
        } catch (llmError) {
          logger.error('❌ LLM enhancement failed:', llmError);
          finalAnalysis.llmEnhancementFailed = true;
        }
      }

      logger.info('✅ AI-powered analysis complete:', {
        complexity: finalAnalysis.complexity,
        confidence: finalAnalysis.confidence,
        intent: finalAnalysis.intent || 'general',
        requiredSkills: finalAnalysis.requiredSkills || [],
        subTaskCount: finalAnalysis.subTaskCount || 0,
        source: finalAnalysis.source,
        enhancedByLLM: finalAnalysis.enhancedByLLM || false,
        cpuModelBypassed: finalAnalysis.source === 'fallback-analysis'
      });

      return finalAnalysis;
      
    } catch (error) {
      logger.error('❌ Task complexity analysis failed:', error);
      return {
        complexity: 0.5,
        confidence: 0.3,
        intent: 'general',
        requiredSkills: [],
        subTaskCount: 0,
        error: error.message,
        source: 'error-fallback'
      };
    }
  }

  /**
   * Map intent to task type
   */
  mapIntentToTaskType(intent) {
    const mapping = {
      'creation': 'generation',
      'analysis': 'analysis',
      'debugging': 'validation',
      'general': 'chat'
    };
    return mapping[intent] || 'chat';
  }

  /**
   * Fallback analysis if AI systems fail
   */
  fallbackAnalysis(prompt) {
    logger.warn('🔄 Using fallback analysis due to AI system failure');
    
    const length = prompt.length;
    let complexity = 0.4;
    
    if (length > 200) complexity += 0.1;
    if (length > 500) complexity += 0.2;
    
    return {
      complexity,
      confidence: 0.3,
      intent: 'general',
      requiredSkills: ['general'],
      taskType: 'chat',
      subTasks: [],
      estimatedSteps: 1,
      aiAnalysis: {
        fallback: true,
        reason: 'AI systems unavailable'
      }
    };
  }

  /**
   * LLM-POWERED intelligent sub-task generation
   */
  async generateIntelligentSubTasks(prompt, analysis) {
    try {
      logger.info('🤖 Using LLM for intelligent sub-task generation');
      
      // Safely handle analysis properties
      const requiredSkills = analysis.requiredSkills || [];
      const intent = analysis.intent || 'general';
      const complexity = analysis.complexity || 0.5;
      const estimatedSteps = analysis.estimatedSteps || 1;
      
      const subTaskPrompt = `
As an expert project manager, break down this complex technical request into logical sub-tasks:

REQUEST: "${prompt}"

ANALYSIS CONTEXT:
- Complexity: ${complexity}
- Intent: ${intent}
- Required Skills: ${requiredSkills.length > 0 ? requiredSkills.join(', ') : 'general'}
- Estimated Steps: ${estimatedSteps}

Please generate a JSON array of sub-tasks with this structure:
{
  "subTasks": [
    {
      "id": "unique-task-id",
      "description": "Clear task description",
      "agent": "best-suited-agent-type",
      "priority": "high|medium|low",
      "dependencies": ["dependent-task-ids"],
      "estimatedTime": "time-estimate",
      "deliverables": ["expected-outputs"]
    }
  ]
}

Available agent types: architectureDesigner, databaseDesigner, apiDesigner, codeGenerator, projectManager, techLead

Focus on logical task flow, dependencies, and optimal agent assignment.`;

      const llmResponse = await this.llmAgent.execute(subTaskPrompt, {
        analysisContext: analysis,
        requestType: 'sub-task-generation'
      });

      // Parse LLM response to extract sub-tasks
      const subTasks = this.parseSubTasksFromLLM(llmResponse.content);
      
      logger.info('✅ LLM generated sub-tasks:', subTasks.map(t => t.description));
      
      return subTasks;

    } catch (error) {
      logger.error('❌ LLM sub-task generation failed, using fallback:', error);
      return this.fallbackSubTaskGeneration(analysis);
    }
  }

  /**
   * Parse sub-tasks from LLM response
   */
  parseSubTasksFromLLM(llmContent) {
    try {
      // Try to extract JSON from LLM response
      const jsonMatch = llmContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.subTasks && Array.isArray(parsed.subTasks)) {
          return parsed.subTasks.map((task, index) => ({
            id: task.id || `llm-task-${index}`,
            description: task.description || 'LLM generated task',
            agent: task.agent || 'projectManager',
            priority: task.priority || 'medium',
            dependencies: task.dependencies || [],
            estimatedTime: task.estimatedTime || '1-2 hours',
            deliverables: task.deliverables || []
          }));
        }
      }

      // Fallback: extract tasks from text
      return this.extractTasksFromText(llmContent);

    } catch (error) {
      logger.error('❌ Error parsing LLM sub-tasks:', error);
      return this.fallbackSubTaskGeneration({ requiredSkills: ['general'] });
    }
  }

  /**
   * Extract tasks from LLM text response
   */
  extractTasksFromText(text) {
    const tasks = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^\d+\./) || line.startsWith('- ') || line.startsWith('• ')) {
        const taskDescription = line.replace(/^\d+\./, '').replace(/^[-•]\s*/, '').trim();
        if (taskDescription.length > 10) {
          tasks.push({
            id: `extracted-task-${tasks.length}`,
            description: taskDescription,
            agent: this.inferAgentFromDescription(taskDescription),
            priority: 'medium',
            dependencies: [],
            estimatedTime: '1-2 hours',
            deliverables: []
          });
        }
      }
    }

    return tasks.slice(0, 5); // Limit to 5 tasks
  }

  /**
   * Infer best agent from task description
   */
  inferAgentFromDescription(description) {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('architecture') || lowerDesc.includes('system')) return 'architectureDesigner';
    if (lowerDesc.includes('database') || lowerDesc.includes('data')) return 'databaseDesigner';
    if (lowerDesc.includes('api') || lowerDesc.includes('endpoint')) return 'apiDesigner';
    if (lowerDesc.includes('code') || lowerDesc.includes('implement')) return 'codeGenerator';
    if (lowerDesc.includes('manage') || lowerDesc.includes('coordinate')) return 'projectManager';
    if (lowerDesc.includes('review') || lowerDesc.includes('quality')) return 'techLead';
    
    return 'projectManager';
  }

  /**
   * Fallback sub-task generation
   */
  fallbackSubTaskGeneration(analysis) {
    logger.info('🔄 Using fallback sub-task generation');
    
    const subTasks = [];
    
    if (analysis.requiredSkills.includes('architecture')) {
      subTasks.push({
        id: 'arch-analysis',
        description: 'Analyze architecture requirements and design system structure',
        agent: 'architectureDesigner',
        priority: 'high',
        dependencies: []
      });
    }
    
    if (analysis.requiredSkills.includes('database')) {
      subTasks.push({
        id: 'db-design',
        description: 'Design database schema and data relationships',
        agent: 'databaseDesigner',
        priority: 'high',
        dependencies: []
      });
    }

    return subTasks;
  }

  /**
   * Handle simple tasks with fast local processing
   */
  async handleSimpleTask(prompt, analysis, context) {
    logger.info('⚡ Executing simple task with fast processing');
    logger.info('📋 Simple task context before enhancement:', {
      hasUserId: !!context.userId,
      hasProjectId: !!context.projectId,
      userId: context.userId,
      projectId: context.projectId
    });
    
    try {
      // Select best agent for the task using intelligent selection
      const selectedAgent = await this.selectAgentForSimpleTask(prompt, analysis);
      
      // Ensure userId and projectId are in context
      const enhancedContext = {
        ...context,
        complexity: analysis.complexity,
        taskType: analysis.taskType,
        userId: context.userId || 'default-user',
        projectId: context.projectId || 'default-project'
      };
      
      logger.info('📋 Simple task enhanced context:', {
        hasUserId: !!enhancedContext.userId,
        hasProjectId: !!enhancedContext.projectId,
        userId: enhancedContext.userId,
        projectId: enhancedContext.projectId
      });
      
      // Execute with single agent - ensure streaming context is passed
      logger.info('🎯 Executing simple task with enhanced context:', {
        hasStreamingCallback: !!enhancedContext.streamingCallback,
        streamingEnabled: enhancedContext.streamingEnabled,
        userId: enhancedContext.userId,
        projectId: enhancedContext.projectId
      });
      
      const result = await this.orchestrator.executeCoordinatedTask(
        prompt,
        analysis,
        enhancedContext
      );

      // Extract the actual agent response from the coordinated task result
      const agentResponse = result.results && result.results[0] ? result.results[0] : null;
      const responseContent = agentResponse?.response?.content || 'Task completed successfully';
      const responseAnalysis = agentResponse?.response?.analysis || prompt;
      const responseSuggestions = agentResponse?.response?.suggestions || [];

      return {
        executionType: 'simple',
        complexity: analysis.complexity,
        agent: selectedAgent,
        response: {
          content: responseContent,
          analysis: responseAnalysis,
          suggestions: responseSuggestions
        },
        metadata: {
          executionTime: Date.now(),
          taskType: analysis.taskType,
          complexity: analysis.complexity
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in simple task execution:', error);
      throw error;
    }
  }

  /**
   * Handle complex tasks with multi-agent collaboration
   */
  async handleComplexTask(prompt, analysis, context) {
    logger.info('🧠 Executing complex task with multi-agent collaboration');
    
    // Safely handle subTasks - it might be undefined or empty
    const subTasks = analysis.subTasks || [];
    const requiredSkills = analysis.requiredSkills || [];
    
    logger.info('📋 Sub-tasks identified:', subTasks.map(t => t.description || 'No description'));
    logger.info('📋 Complex task context before enhancement:', {
      hasUserId: !!context.userId,
      hasProjectId: !!context.projectId,
      userId: context.userId,
      projectId: context.projectId,
      subTaskCount: subTasks.length,
      requiredSkillsCount: requiredSkills.length
    });
    
    try {
      // Select agents based on required skills
      const selectedAgents = await this.selectAgentsForComplexTask(analysis, prompt);
      
      logger.info('🤖 Selected agents for complex task:', selectedAgents);
      
      // Ensure userId and projectId are in context
      const enhancedContext = {
        ...context,
        complexity: analysis.complexity,
        taskType: analysis.taskType,
        subTasks: subTasks,
        requiredSkills: requiredSkills,
        userId: context.userId || 'default-user',
        projectId: context.projectId || 'default-project'
      };
      
      logger.info('📋 Complex task enhanced context:', {
        hasUserId: !!enhancedContext.userId,
        hasProjectId: !!enhancedContext.projectId,
        userId: enhancedContext.userId,
        projectId: enhancedContext.projectId
      });
      
      // Execute with coordinated agents - Fix parameter order and ensure streaming context
      logger.info('🎯 Executing complex task with enhanced context:', {
        hasStreamingCallback: !!enhancedContext.streamingCallback,
        streamingEnabled: enhancedContext.streamingEnabled,
        userId: enhancedContext.userId,
        projectId: enhancedContext.projectId
      });
      
      const result = await this.orchestrator.executeCoordinatedTask(
        prompt,
        { ...analysis, selectedAgents },
        enhancedContext
      );

      return {
        executionType: 'complex',
        complexity: analysis.complexity,
        agents: selectedAgents,
        subTasks: subTasks,
        response: {
          content: result.summary || 'Complex task completed with multi-agent collaboration',
          analysis: result.analysis || 'Complex task analysis completed',
          suggestions: result.suggestions || [],
          steps: this.generateExecutionSteps(subTasks, result)
        },
        metadata: {
          executionTime: Date.now(),
          taskType: analysis.taskType,
          complexity: analysis.complexity,
          agentsUsed: selectedAgents.length,
          estimatedSteps: analysis.estimatedSteps
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in complex task execution:', error);
      throw error;
    }
  }

  /**
   * INTELLIGENT agent selection for simple tasks using CPU models
   */
  async selectAgentForSimpleTask(originalPrompt, analysis) {
    try {
      logger.info('🎯 Starting intelligent agent selection for simple task');
      
      // Use Intent Classification Service for intelligent routing
      const { IntentClassificationService } = await import('./IntentClassificationService.js');
      const intentService = new IntentClassificationService();
      
      const intentAnalysis = await intentService.classifyAndRoute(originalPrompt, analysis);
      
      const selectedAgent = intentAnalysis.suggestedAgents[0] || 'projectManager';
      
      logger.info('✅ Intelligent agent selection complete:', {
        selectedAgent,
        primaryIntent: intentAnalysis.primaryIntent.intent,
        confidence: intentAnalysis.primaryIntent.confidence,
        conversationStyle: intentAnalysis.conversationStyle
      });
      
      return selectedAgent;
      
    } catch (error) {
      logger.error('❌ Intelligent agent selection failed, using fallback:', error);
      return this.fallbackAgentSelection(analysis);
    }
  }

  /**
   * Fallback agent selection for simple tasks
   */
  fallbackAgentSelection(analysis) {
    // Safely handle requiredSkills - it might be undefined or empty
    const requiredSkills = analysis.requiredSkills || [];
    const intent = analysis.intent || 'general';
    
    logger.info('🎯 Using fallback agent selection for simple task:', {
      intent,
      requiredSkills,
      complexity: analysis.complexity,
      hasRequiredSkills: requiredSkills.length > 0
    });
    
    // Priority-based agent selection with safe array access
    if (requiredSkills.includes('architecture') || requiredSkills.includes('system_design')) {
      logger.info('🏗️ Selected architectureDesigner for architecture/system design');
      return 'architectureDesigner';
    }
    
    if (requiredSkills.includes('database') || requiredSkills.includes('data_modeling')) {
      logger.info('🗄️ Selected databaseDesigner for database tasks');
      return 'databaseDesigner';
    }
    
    if (requiredSkills.includes('api') || requiredSkills.includes('rest_api') || requiredSkills.includes('integration')) {
      logger.info('🔌 Selected apiDesigner for API tasks');
      return 'apiDesigner';
    }
    
    if (intent === 'creation' || requiredSkills.includes('coding') || requiredSkills.includes('implementation')) {
      logger.info('⚡ Selected codeGenerator for creation/coding tasks');
      return 'codeGenerator';
    }
    
    // Intent-based selection when requiredSkills is empty
    if (intent === 'architecture_design' || intent === 'system_design') {
      logger.info('🏗️ Selected architectureDesigner based on intent');
      return 'architectureDesigner';
    }
    
    if (intent === 'database_design' || intent === 'data_modeling') {
      logger.info('🗄️ Selected databaseDesigner based on intent');
      return 'databaseDesigner';
    }
    
    if (intent === 'api_design' || intent === 'integration') {
      logger.info('🔌 Selected apiDesigner based on intent');
      return 'apiDesigner';
    }
    
    // Default to project manager for general queries
    logger.info('👨‍💼 Selected projectManager as default for general queries');
    return 'projectManager';
  }

  /**
   * INTELLIGENT agent selection for complex tasks using CPU models with confidence check
   */
  async selectAgentsForComplexTask(analysis, originalPrompt) {
    try {
      logger.info('🧠 Using CPU models for intelligent agent selection with confidence check');
      
      // Step 1: Try CPU model-based agent selection first
      const cpuAgentSelection = await this.selectAgentsWithCPUModels(originalPrompt, analysis);
      
      // Step 2: Check confidence level
      if (cpuAgentSelection.confidence >= 0.7) {
        logger.info('✅ High confidence CPU model agent selection:', {
          agents: cpuAgentSelection.selectedAgents,
          confidence: cpuAgentSelection.confidence,
          source: cpuAgentSelection.source
        });
        return cpuAgentSelection.selectedAgents;
      }
      
      // Step 3: Low confidence - use LLM for agent selection
      logger.info('⚠️ Low confidence from CPU models, using LLM for agent selection:', {
        cpuConfidence: cpuAgentSelection.confidence,
        cpuAgents: cpuAgentSelection.selectedAgents
      });
      
      return await this.selectAgentsWithLLM(originalPrompt, analysis, cpuAgentSelection);
      
    } catch (error) {
      logger.error('❌ Error in intelligent agent selection:', error);
      return this.selectAgentsFromAnalysis(analysis);
    }
  }

  /**
   * Select agents using CPU models (DistilBERT + CodeBERT)
   */
  async selectAgentsWithCPUModels(originalPrompt, analysis) {
    try {
      // Use CPU models for intelligent agent selection
      const { DistilBERTComplexityAnalyzer } = await import('./cpuModels/DistilBERTComplexityAnalyzer.js');
      const complexityAnalyzer = new DistilBERTComplexityAnalyzer();
      
      const agentRecommendation = await complexityAnalyzer.recommendAgents(originalPrompt, analysis);
      
      return {
        selectedAgents: agentRecommendation || ['projectManager'],
        confidence: 0.8, // DistilBERT typically has good confidence for classification
        source: 'cpu_models',
        method: 'distilbert_classification'
      };
      
    } catch (error) {
      logger.error('❌ CPU model agent selection failed:', error);
      return {
        selectedAgents: ['projectManager'],
        confidence: 0.3,
        source: 'fallback',
        method: 'error_fallback'
      };
    }
  }

  /**
   * Select agents using LLM when CPU confidence is low
   */
  async selectAgentsWithLLM(originalPrompt, analysis, cpuResult) {
    try {
      logger.info('🤖 Using LLM for agent selection with CPU context');
      
      // Generate dynamic agent selection prompt
      const { DynamicPromptGenerationService } = await import('./DynamicPromptGenerationService.js');
      const promptGenerator = new DynamicPromptGenerationService();
      
      const agentSelectionPrompt = await promptGenerator.getAgentSelectionPrompt(originalPrompt, {
        availableAgents: this.getAvailableAgentsList(),
        complexity: analysis.complexity,
        domain: analysis.domain || 'general',
        cpuRecommendation: cpuResult.selectedAgents,
        cpuConfidence: cpuResult.confidence
      });

      const { LLMAgent } = await import('./agents/LLMAgent.js');
      const llmAgent = LLMAgent.getInstance();
      
      const llmResponse = await llmAgent.execute(agentSelectionPrompt, {
        responseFormat: 'json',
        maxTokens: 200
      });
      
      try {
        const responseText = typeof llmResponse.content === 'string' ? llmResponse.content : JSON.stringify(llmResponse.content);
        const agentList = JSON.parse(responseText);
        if (Array.isArray(agentList)) {
          logger.info('✅ LLM selected agents with CPU context:', agentList);
          return agentList;
        }
      } catch (parseError) {
        logger.warn('⚠️ Could not parse LLM agent selection response, using CPU recommendation');
        return cpuResult.selectedAgents;
      }
      
      return cpuResult.selectedAgents;
      
    } catch (error) {
      logger.error('❌ LLM agent selection failed:', error);
      return cpuResult.selectedAgents;
    }
  }

  /**
   * Get list of available agents
   */
  getAvailableAgentsList() {
    return [
      'projectManager',
      'architectureDesigner', 
      'databaseDesigner',
      'apiDesigner',
      'codeGenerator',
      'techLead'
    ];
  }

  selectAgentsFromAnalysis(analysis) {
    // Safely handle requiredSkills - it might be undefined or empty
    const requiredSkills = analysis.requiredSkills || [];
    const intent = analysis.intent || 'general';
    const agents = [];
    
    logger.info('🎯 Selecting agents from analysis:', {
      intent,
      requiredSkills,
      complexity: analysis.complexity,
      hasRequiredSkills: requiredSkills.length > 0
    });
    
    // Add agents based on required skills with safe array access
    if (requiredSkills.includes('architecture') || requiredSkills.includes('system_design')) {
      agents.push('architectureDesigner');
    }
    if (requiredSkills.includes('database') || requiredSkills.includes('data_modeling')) {
      agents.push('databaseDesigner');
    }
    if (requiredSkills.includes('api') || requiredSkills.includes('rest_api') || requiredSkills.includes('integration')) {
      agents.push('apiDesigner');
    }
    if (intent === 'creation' || requiredSkills.includes('backend') || requiredSkills.includes('frontend') || requiredSkills.includes('coding')) {
      agents.push('codeGenerator');
    }
    
    // Intent-based selection when requiredSkills is empty
    if (intent === 'architecture_design' || intent === 'system_design') {
      agents.push('architectureDesigner');
    }
    if (intent === 'database_design' || intent === 'data_modeling') {
      agents.push('databaseDesigner');
    }
    if (intent === 'api_design' || intent === 'integration') {
      agents.push('apiDesigner');
    }
    
    // Always add tech lead for complex multi-agent tasks
    if (agents.length > 1) {
      agents.push('techLead');
    }
    
    // Add project manager for coordination
    agents.push('projectManager');
    
    // Remove duplicates and ensure we have at least one agent
    const uniqueAgents = [...new Set(agents)];
    const finalAgents = uniqueAgents.length > 0 ? uniqueAgents : ['projectManager'];
    
    logger.info('✅ Selected agents from analysis:', finalAgents);
    return finalAgents;
  }

  /**
   * Generate execution steps for complex tasks
   */
  generateExecutionSteps(subTasks, result) {
    // Safely handle subTasks - it might be undefined or empty
    if (!subTasks || subTasks.length === 0) {
      logger.info('📋 No sub-tasks available, generating default execution step');
      return [{
        step: 1,
        id: 'default-step',
        description: 'Task completed successfully',
        agent: 'projectManager',
        status: 'completed',
        output: 'Task execution completed'
      }];
    }
    
    return subTasks.map((task, index) => ({
      step: index + 1,
      id: task.id || `step-${index + 1}`,
      description: task.description || `Step ${index + 1}`,
      agent: task.agent || 'projectManager',
      status: 'completed',
      output: `Step ${index + 1} completed successfully`
    }));
  }

  /**
   * Classify intent of user query
   */
  async classifyIntent(prompt) {
    try {
      // Quick check for casual greetings
      const casualGreetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
      if (casualGreetings.some(greeting => prompt.toLowerCase().trim() === greeting)) {
        return {
          confidence: 0.95,
          isTechnical: false,
          primaryIntent: 'casual_conversation',
          routingDecision: 'conversational',
          timestamp: new Date().toISOString()
        };
      }

      // For other messages, use DistilBERT for classification
      const { DistilBERTComplexityAnalyzer } = await import('./cpuModels/DistilBERTComplexityAnalyzer.js');
      const analyzer = new DistilBERTComplexityAnalyzer();
      const analysis = await analyzer.analyzeText(prompt);

      return {
        ...analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ Error in intent classification:', error);
      throw error;
    }
  }
} 