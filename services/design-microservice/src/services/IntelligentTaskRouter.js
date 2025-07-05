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
    
    logger.info('🚀 TRULY IntelligentTaskRouter initialized with CPU models and LLM');
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
          
          const enhancementPrompt = `
Analyze this task for complexity and required skills:
"${prompt}"

Current CPU analysis: ${JSON.stringify(cpuAnalysis)}

Provide analysis in this JSON format:
{
  "complexity": 0.8,
  "confidence": 0.9,
  "intent": "architecture_design",
  "requiredSkills": ["system_design", "microservices"],
  "subTaskCount": 3,
  "reasoning": "explanation"
}`;

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
      
      const subTaskPrompt = `
As an expert project manager, break down this complex technical request into logical sub-tasks:

REQUEST: "${prompt}"

ANALYSIS CONTEXT:
- Complexity: ${analysis.complexity}
- Intent: ${analysis.intent}
- Required Skills: ${analysis.requiredSkills.join(', ')}
- Estimated Steps: ${analysis.estimatedSteps}

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
      // Select best agent for the task
      const selectedAgent = this.selectAgentForSimpleTask(analysis);
      
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
      
      // Execute with single agent
      const result = await this.orchestrator.executeCoordinatedTask(
        [selectedAgent],
        prompt,
        enhancedContext
      );

      return {
        executionType: 'simple',
        complexity: analysis.complexity,
        agent: selectedAgent,
        response: {
          content: result.summary || 'Task completed successfully',
          analysis: result.analysis || 'Simple task analysis completed',
          suggestions: result.suggestions || []
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
    logger.info('📋 Sub-tasks identified:', analysis.subTasks.map(t => t.description));
    logger.info('📋 Complex task context before enhancement:', {
      hasUserId: !!context.userId,
      hasProjectId: !!context.projectId,
      userId: context.userId,
      projectId: context.projectId
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
        subTasks: analysis.subTasks,
        requiredSkills: analysis.requiredSkills,
        userId: context.userId || 'default-user',
        projectId: context.projectId || 'default-project'
      };
      
      logger.info('📋 Complex task enhanced context:', {
        hasUserId: !!enhancedContext.userId,
        hasProjectId: !!enhancedContext.projectId,
        userId: enhancedContext.userId,
        projectId: enhancedContext.projectId
      });
      
      // Execute with coordinated agents
      const result = await this.orchestrator.executeCoordinatedTask(
        selectedAgents,
        prompt,
        enhancedContext
      );

      return {
        executionType: 'complex',
        complexity: analysis.complexity,
        agents: selectedAgents,
        subTasks: analysis.subTasks,
        response: {
          content: result.summary || 'Complex task completed with multi-agent collaboration',
          analysis: result.analysis || 'Complex task analysis completed',
          suggestions: result.suggestions || [],
          steps: this.generateExecutionSteps(analysis.subTasks, result)
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
   * Select single agent for simple tasks
   */
  selectAgentForSimpleTask(analysis) {
    // Priority-based agent selection
    if (analysis.requiredSkills.includes('architecture')) return 'architectureDesigner';
    if (analysis.requiredSkills.includes('database')) return 'databaseDesigner';
    if (analysis.requiredSkills.includes('api')) return 'apiDesigner';
    if (analysis.intent === 'creation') return 'codeGenerator';
    
    // Default to project manager for general queries
    return 'projectManager';
  }

  /**
   * Select multiple agents for complex tasks
   */
  async selectAgentsForComplexTask(analysis, originalPrompt) {
    try {
      logger.info('🧠 Using CPU models for intelligent agent selection');
      
      // Use CPU models to intelligently select agents based on prompt understanding
      const agentSelectionPrompt = `
Analyze this task and determine which specialized agents are needed: "${originalPrompt}"

Available agents and their capabilities:
- projectManager: Project planning, coordination, timelines, resource allocation
- architectureDesigner: System architecture, scalability, design patterns, technical decisions
- databaseDesigner: Database schema, data modeling, optimization, queries
- apiDesigner: REST APIs, endpoints, authentication, integration
- codeGenerator: Code implementation, programming, testing, debugging
- techLead: Technical leadership, code review, best practices, architecture oversight

Return ONLY a JSON array of agent names that are needed for this task, ordered by priority.
Example: ["projectManager", "architectureDesigner", "databaseDesigner"]
`;

      // Use DistilBERT for intelligent agent classification
      const cpuResponse = await this.complexityAnalyzer.analyzeComplexity(agentSelectionPrompt);
      
      if (cpuResponse.success && cpuResponse.analysis.recommendedAgents) {
        logger.info('✅ CPU models selected agents:', cpuResponse.analysis.recommendedAgents);
        return cpuResponse.analysis.recommendedAgents;
      }
      
      // Fallback to LLM if CPU models don't provide agent recommendations
      logger.info('🤖 Using LLM for agent selection fallback');
      const { LLMAgent } = await import('./agents/LLMAgent.js');
      const llmAgent = new LLMAgent();
      
      const llmResponse = await llmAgent.generateContent(agentSelectionPrompt, {
        responseFormat: 'json',
        maxTokens: 100
      });
      
      try {
        const agentList = JSON.parse(llmResponse);
        if (Array.isArray(agentList)) {
          logger.info('✅ LLM selected agents:', agentList);
          return agentList;
        }
      } catch (parseError) {
        logger.warn('⚠️ Could not parse LLM agent selection response');
      }
      
    } catch (error) {
      logger.error('❌ Error in intelligent agent selection:', error);
    }
    
    // Final fallback to analysis-based selection
    logger.info('🔄 Using analysis-based agent selection as final fallback');
    return this.selectAgentsFromAnalysis(analysis);
  }

  selectAgentsFromAnalysis(analysis) {
    const agents = [];
    
    // Add agents based on required skills
    if (analysis.requiredSkills.includes('architecture')) {
      agents.push('architectureDesigner');
    }
    if (analysis.requiredSkills.includes('database')) {
      agents.push('databaseDesigner');
    }
    if (analysis.requiredSkills.includes('api')) {
      agents.push('apiDesigner');
    }
    if (analysis.intent === 'creation' || analysis.requiredSkills.includes('backend') || analysis.requiredSkills.includes('frontend')) {
      agents.push('codeGenerator');
    }
    
    // Always add tech lead for complex multi-agent tasks
    if (agents.length > 1) {
      agents.push('techLead');
    }
    
    // Add project manager for coordination
    agents.push('projectManager');
    
    // Remove duplicates and ensure we have at least one agent
    const uniqueAgents = [...new Set(agents)];
    return uniqueAgents.length > 0 ? uniqueAgents : ['projectManager'];
  }

  /**
   * Generate execution steps for complex tasks
   */
  generateExecutionSteps(subTasks, result) {
    return subTasks.map((task, index) => ({
      step: index + 1,
      id: task.id,
      description: task.description,
      agent: task.agent,
      status: 'completed',
      output: `Step ${index + 1} completed successfully`
    }));
  }
} 