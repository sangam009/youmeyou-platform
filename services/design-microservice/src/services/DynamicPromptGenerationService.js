import logger from '../utils/logger.js';

/**
 * Dynamic Prompt Generation using Flan-T5
 * Replaces all hardcoded prompts with dynamically generated, context-aware prompts
 */
export class DynamicPromptGenerationService {
  constructor() {
    this.gatewayEndpoint = process.env.CPU_MODELS_GATEWAY || 'http://cpu-models-gateway-prod:8000';
    this.flanT5Available = false;
    this.promptCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    this.init();
  }

  async init() {
    try {
      const healthCheck = await fetch(`${this.gatewayEndpoint}/health`);
      if (healthCheck.ok) {
        const status = await healthCheck.json();
        this.flanT5Available = status.models?.['flan-t5'] || false;
        
        logger.info('🎨 DynamicPromptGenerationService initialized:', {
          endpoint: this.gatewayEndpoint,
          flanT5Available: this.flanT5Available
        });
      }
    } catch (error) {
      logger.warn('⚠️ Flan-T5 not available, using enhanced fallback prompts:', error.message);
    }
  }

  /**
   * MAIN FUNCTION: Generate dynamic prompt for any context
   */
  async generatePrompt(promptType, context = {}) {
    const cacheKey = `${promptType}_${JSON.stringify(context)}`;
    
    // Check cache first
    if (this.promptCache.has(cacheKey)) {
      const cached = this.promptCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info('📦 Using cached prompt for:', promptType);
        return cached.prompt;
      }
    }

    logger.info('🎨 Generating dynamic prompt:', {
      type: promptType,
      context: Object.keys(context),
      useFlanT5: this.flanT5Available
    });

    let generatedPrompt;
    if (this.flanT5Available) {
      generatedPrompt = await this.generateWithFlanT5(promptType, context);
    } else {
      generatedPrompt = await this.generateFallbackPrompt(promptType, context);
    }

    // Cache the result
    this.promptCache.set(cacheKey, {
      prompt: generatedPrompt,
      timestamp: Date.now()
    });

    return generatedPrompt;
  }

  /**
   * Generate prompt using Flan-T5 model
   */
  async generateWithFlanT5(promptType, context) {
    try {
      const promptInstructions = this.buildPromptInstructions(promptType, context);
      
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/flan-t5/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: promptInstructions.instruction,
          context: promptInstructions.context,
          constraints: promptInstructions.constraints,
          max_length: promptInstructions.maxLength || 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Flan-T5 generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info('✅ Flan-T5 prompt generated:', {
        type: promptType,
        promptLength: result.generated_text.length,
        promptPreview: result.generated_text.substring(0, 100) + '...'
      });

      return result.generated_text;

    } catch (error) {
      logger.error('❌ Flan-T5 prompt generation failed:', error);
      return this.generateFallbackPrompt(promptType, context);
    }
  }

  /**
   * Build instruction templates for Flan-T5
   */
  buildPromptInstructions(promptType, context) {
    const instructions = {
      // Agent collaboration prompts
      'agent_collaboration': {
        instruction: `Generate a professional prompt for a ${context.agentName} to collaborate on a specific task. The prompt should establish the agent's expertise, provide clear context, and request specific deliverables.`,
        context: `Agent: ${context.agentName}\nTask: ${context.task}\nUser Context: ${JSON.stringify(context.userContext || {})}\nTechnical Requirements: ${context.requirements || 'General'}`,
        constraints: [
          'Must establish agent expertise and role',
          'Include specific task requirements',
          'Request actionable recommendations',
          'Professional and clear tone',
          'Include context about integration needs'
        ],
        maxLength: 400
      },

      // Task analysis prompts
      'task_analysis': {
        instruction: `Create a comprehensive prompt for analyzing a technical task. The prompt should guide detailed analysis of scope, requirements, complexity, and implementation approach.`,
        context: `Task Description: ${context.userQuery}\nComplexity Level: ${context.complexity || 'medium'}\nDomain: ${context.domain || 'general'}\nUser Experience Level: ${context.userLevel || 'intermediate'}`,
        constraints: [
          'Request structured analysis with clear sections',
          'Include scope and requirement identification',
          'Ask for technical considerations',
          'Request implementation roadmap',
          'Include risk assessment'
        ],
        maxLength: 450
      },

      // Code generation prompts
      'code_generation': {
        instruction: `Generate a prompt for creating production-ready code. The prompt should specify requirements, coding standards, testing needs, and documentation expectations.`,
        context: `Technology Stack: ${context.techStack || 'modern web'}\nCode Type: ${context.codeType || 'general'}\nComplexity: ${context.complexity || 'medium'}\nRequirements: ${context.requirements || 'standard functionality'}`,
        constraints: [
          'Specify coding standards and best practices',
          'Request comprehensive error handling',
          'Include testing requirements',
          'Ask for documentation and comments',
          'Emphasize maintainability and scalability'
        ],
        maxLength: 400
      },

      // Architecture design prompts
      'architecture_design': {
        instruction: `Create a prompt for designing system architecture. The prompt should cover scalability, performance, security, and integration requirements.`,
        context: `System Type: ${context.systemType || 'web application'}\nScale: ${context.scale || 'medium'}\nKey Features: ${context.features || 'standard'}\nConstraints: ${context.constraints || 'none specified'}`,
        constraints: [
          'Address scalability and performance',
          'Include security considerations',
          'Cover data flow and integration',
          'Request specific architectural patterns',
          'Include deployment considerations'
        ],
        maxLength: 500
      },

      // Casual conversation prompts
      'casual_conversation': {
        instruction: `Generate a friendly, helpful prompt for casual conversation. The prompt should be welcoming, offer assistance, and gently guide toward technical topics if appropriate.`,
        context: `User Message: ${context.userQuery}\nConversation Style: ${context.style || 'friendly professional'}\nSuggest Redirect: ${context.suggestRedirect || false}`,
        constraints: [
          'Warm and welcoming tone',
          'Acknowledge user input appropriately',
          'Offer specific help options',
          'Keep conversation engaging',
          'Subtly guide toward technical assistance if needed'
        ],
        maxLength: 300
      },

      // Agent selection prompts
      'agent_selection': {
        instruction: `Create a prompt for intelligent agent selection. The prompt should analyze task requirements and recommend the most suitable specialized agents.`,
        context: `Task: ${context.originalPrompt}\nAvailable Agents: ${context.availableAgents || 'all standard agents'}\nComplexity: ${context.complexity || 'medium'}\nDomain: ${context.domain || 'general'}`,
        constraints: [
          'Analyze task requirements thoroughly',
          'Consider agent specializations',
          'Recommend optimal agent combinations',
          'Explain selection reasoning',
          'Consider task complexity and dependencies'
        ],
        maxLength: 350
      },

      // Task enhancement prompts for LLM analysis
      'task_enhancement': {
        instruction: `Generate a prompt for enhancing task analysis. The prompt should request detailed complexity analysis, skill requirements, and JSON-formatted output.`,
        context: `User Query: ${context.userQuery}\nCPU Analysis: ${context.cpuAnalysis}\nAnalysis Type: ${context.analysisType}\nExpected Format: ${context.expectedFormat}\nComplexity Level: ${context.complexityLevel}`,
        constraints: [
          'Request specific JSON format output',
          'Ask for complexity scoring (0.0-1.0)',
          'Request required skills identification',
          'Include confidence scoring',
          'Ask for reasoning behind analysis',
          'Consider CPU model input for enhancement'
        ],
        maxLength: 400
      }
    };

    return instructions[promptType] || {
      instruction: `Generate a professional prompt for ${promptType} tasks.`,
      context: JSON.stringify(context),
      constraints: ['Clear and professional', 'Specific and actionable'],
      maxLength: 300
    };
  }

  /**
   * Enhanced fallback prompt generation when Flan-T5 is unavailable
   */
  async generateFallbackPrompt(promptType, context) {
    logger.info('🔄 Using enhanced fallback prompt generation for:', promptType);

    const templates = {
      'agent_collaboration': this.generateAgentCollaborationPrompt(context),
      'task_analysis': this.generateTaskAnalysisPrompt(context),
      'code_generation': this.generateCodeGenerationPrompt(context),
      'architecture_design': this.generateArchitectureDesignPrompt(context),
      'casual_conversation': this.generateCasualConversationPrompt(context),
      'agent_selection': this.generateAgentSelectionPrompt(context),
      'task_enhancement': this.generateTaskEnhancementPrompt(context)
    };

    return templates[promptType] || this.generateGenericPrompt(context);
  }

  /**
   * Generate agent collaboration prompt
   */
  generateAgentCollaborationPrompt(context) {
    const agentExpertise = {
      'architectureDesigner': 'Senior System Architect specializing in scalable design patterns, microservices architecture, and system integration',
      'databaseDesigner': 'Database Architect with expertise in schema design, query optimization, and data modeling',
      'apiDesigner': 'API Architect focused on RESTful design, API security, authentication, and integration patterns',
      'codeGenerator': 'Senior Software Engineer specializing in clean code, testing frameworks, and implementation best practices',
      'projectManager': 'Technical Project Manager with expertise in agile methodologies, resource planning, and team coordination',
      'techLead': 'Technical Lead responsible for architectural decisions, code quality standards, and technical mentorship'
    };

    const expertise = agentExpertise[context.agentName] || 'Technical expert';
    
    return `You are a ${expertise}.

COLLABORATION CONTEXT:
- Current Task: ${context.task}
- Technical Domain: ${context.domain || 'General software development'}
- Complexity Level: ${context.complexity || 'Medium'}
- Integration Requirements: ${context.integrationNeeds || 'Standard system integration'}

COLLABORATION OBJECTIVES:
1. Apply your specialized expertise to analyze the given task
2. Provide specific, implementable recommendations within your domain
3. Identify potential challenges and propose concrete solutions
4. Consider how your recommendations integrate with other system components
5. Suggest clear next steps and deliverables

Please provide your expert analysis and recommendations, focusing on your area of specialization while considering the broader system context.`;
  }

  /**
   * Generate task analysis prompt
   */
  generateTaskAnalysisPrompt(context) {
    return `Analyze the following technical task with comprehensive detail:

TASK: "${context.userQuery}"

ANALYSIS FRAMEWORK:
Please provide a structured analysis covering:

**1. Scope and Requirements Analysis**
- Core functionality and features required
- Technical constraints and limitations
- Integration requirements with existing systems
- User experience and interface considerations

**2. Technical Approach**
- Recommended technology stack and tools
- Architectural patterns and design principles
- Data modeling and storage requirements
- Security and performance considerations

**3. Implementation Roadmap**
- Phase breakdown and milestone definition
- Resource and skill requirements
- Estimated timeline and effort
- Risk assessment and mitigation strategies

**4. Success Criteria**
- Measurable deliverables and outcomes
- Quality assurance and testing approach
- Deployment and maintenance considerations
- Long-term scalability and evolution path

Format your response in clear sections for easy reference and action planning.`;
  }

  /**
   * Generate code generation prompt
   */
  generateCodeGenerationPrompt(context) {
    return `Generate production-ready code implementation with the following specifications:

REQUIREMENTS:
- Technology Stack: ${context.techStack || 'Modern web technologies'}
- Code Type: ${context.codeType || 'Full-stack application components'}
- Complexity Level: ${context.complexity || 'Enterprise-grade'}
- Specific Features: ${context.requirements || 'Standard business functionality'}

IMPLEMENTATION STANDARDS:
1. **Code Quality**: Follow industry best practices, SOLID principles, and clean code guidelines
2. **Error Handling**: Implement comprehensive error handling with proper logging and user feedback
3. **Testing**: Include unit tests, integration tests, and test data setup
4. **Documentation**: Provide clear code comments, API documentation, and usage examples
5. **Security**: Implement proper input validation, authentication, and authorization
6. **Performance**: Optimize for scalability and efficient resource usage

DELIVERABLES:
- Complete implementation code with proper structure
- Test suite with comprehensive coverage
- Configuration and setup instructions
- API documentation (if applicable)
- Deployment and maintenance guidelines

Ensure the code is maintainable, scalable, and follows modern development practices.`;
  }

  /**
   * Generate architecture design prompt
   */
  generateArchitectureDesignPrompt(context) {
    return `Design a comprehensive system architecture with the following requirements:

SYSTEM SPECIFICATIONS:
- System Type: ${context.systemType || 'Distributed web application'}
- Scale Requirements: ${context.scale || 'Medium to high traffic'}
- Key Features: ${context.features || 'Standard business application features'}
- Technical Constraints: ${context.constraints || 'Cloud-native, cost-effective'}

ARCHITECTURAL CONSIDERATIONS:
1. **System Design**: Overall architecture, component relationships, and data flow
2. **Scalability**: Horizontal and vertical scaling strategies, load balancing, caching
3. **Performance**: Response times, throughput optimization, resource efficiency
4. **Security**: Authentication, authorization, data protection, network security
5. **Reliability**: Fault tolerance, disaster recovery, monitoring, and alerting
6. **Integration**: External service integration, API design, data synchronization

DELIVERABLES:
- High-level system architecture diagram
- Component specifications and responsibilities
- Data modeling and storage strategy
- API design and integration patterns
- Deployment and infrastructure requirements
- Security and compliance framework
- Monitoring and operational procedures

Provide specific technology recommendations and implementation guidance for each component.`;
  }

  /**
   * Generate casual conversation prompt
   */
  generateCasualConversationPrompt(context) {
    const redirectMessage = context.suggestRedirect ? 
      `\n\nI notice you might be interested in technical topics. I can help with architecture design, code development, project planning, and system integration. Would you like assistance with any of these areas?` : '';

    return `Hello! I'm your AI assistant specializing in software architecture and development.

I understand you said: "${context.userQuery}"

I'm here to help you with a wide range of technical and project-related tasks including:
- System architecture and design patterns
- Code development and best practices
- Project planning and management
- Database design and optimization
- API development and integration
- Technical problem-solving

Whether you have a specific technical challenge or just want to explore ideas, I'm ready to assist with detailed, practical guidance.${redirectMessage}

How can I help you today?`;
  }

  /**
   * Generate agent selection prompt
   */
  generateAgentSelectionPrompt(context) {
    return `Analyze the following task and recommend the optimal combination of specialized agents:

TASK TO ANALYZE: "${context.originalPrompt}"

AVAILABLE SPECIALIST AGENTS:
- **Project Manager**: Project planning, coordination, timelines, resource allocation, risk management
- **Architecture Designer**: System architecture, scalability patterns, technical design, component integration
- **Database Designer**: Data modeling, schema design, query optimization, database architecture
- **API Designer**: REST API design, authentication, integration patterns, service communication
- **Code Generator**: Implementation code, testing frameworks, coding best practices, development workflows
- **Tech Lead**: Technical leadership, code review, architectural oversight, team guidance

SELECTION CRITERIA:
1. Analyze the task complexity and scope
2. Identify required technical skills and expertise areas
3. Consider interdependencies between different aspects
4. Recommend optimal agent combination for efficiency
5. Suggest execution order and collaboration approach

Please return your recommendation as a prioritized list of agents with brief justification for each selection, considering both the task requirements and agent specializations.`;
  }

  /**
   * Generate task enhancement prompt
   */
  generateTaskEnhancementPrompt(context) {
    return `Enhance and analyze the following task based on CPU model insights:

TASK TO ANALYZE: "${context.userQuery}"

CPU MODEL ANALYSIS:
${context.cpuAnalysis}

ENHANCEMENT REQUIREMENTS:
Please provide a comprehensive analysis in the following JSON format:

{
  "complexity": 0.8,
  "confidence": 0.9,
  "intent": "architecture_design",
  "requiredSkills": ["system_design", "microservices", "database_design"],
  "subTaskCount": 3,
  "reasoning": "Detailed explanation of the analysis",
  "enhancedAnalysis": {
    "technicalDomains": ["backend", "database", "api"],
    "estimatedEffort": "medium",
    "riskFactors": ["complexity", "integration"],
    "recommendedApproach": "incremental_development"
  }
}

ANALYSIS CRITERIA:
1. Evaluate task complexity (0.0 = simple, 1.0 = very complex)
2. Determine confidence in analysis (0.0 = low, 1.0 = high)
3. Identify primary intent and secondary objectives
4. List specific technical skills required
5. Estimate number of logical sub-tasks
6. Provide reasoning for all assessments
7. Consider CPU model insights for enhancement

Please ensure your response is valid JSON and includes all required fields.`;
  }

  /**
   * Get agent selection prompt (convenience method)
   */
  async getAgentSelectionPrompt(originalPrompt, context) {
    return await this.generatePrompt('agent_selection', {
      originalPrompt,
      availableAgents: context.availableAgents,
      complexity: context.complexity,
      domain: context.domain,
      cpuRecommendation: context.cpuRecommendation,
      cpuConfidence: context.cpuConfidence
    });
  }

  /**
   * Get task analysis prompt (convenience method)
   */
  async getTaskAnalysisPrompt(userQuery, context) {
    return await this.generatePrompt('task_analysis', {
      userQuery,
      agentName: context.agentName,
      complexity: context.complexity,
      domain: context.domain,
      userLevel: context.userLevel
    });
  }

  /**
   * Generate generic prompt for unknown types
   */
  generateGenericPrompt(context) {
    return `Please analyze and provide comprehensive assistance with the following:

CONTEXT: ${JSON.stringify(context, null, 2)}

Provide detailed, actionable recommendations based on the given context. Consider technical feasibility, best practices, and practical implementation approaches.`;
  }

  /**
   * Get specific prompt types
   */
  async getAgentCollaborationPrompt(agentName, task, context = {}) {
    return this.generatePrompt('agent_collaboration', {
      agentName,
      task,
      ...context
    });
  }

  async getTaskAnalysisPrompt(userQuery, context = {}) {
    return this.generatePrompt('task_analysis', {
      userQuery,
      ...context
    });
  }

  async getCodeGenerationPrompt(requirements, context = {}) {
    return this.generatePrompt('code_generation', {
      requirements,
      ...context
    });
  }

  async getArchitectureDesignPrompt(systemSpecs, context = {}) {
    return this.generatePrompt('architecture_design', {
      ...systemSpecs,
      ...context
    });
  }

  async getCasualConversationPrompt(userQuery, context = {}) {
    return this.generatePrompt('casual_conversation', {
      userQuery,
      ...context
    });
  }

  async getAgentSelectionPrompt(originalPrompt, context = {}) {
    return this.generatePrompt('agent_selection', {
      originalPrompt,
      ...context
    });
  }

  /**
   * Clear prompt cache
   */
  clearCache() {
    this.promptCache.clear();
    logger.info('🧹 Prompt cache cleared');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      flanT5Available: this.flanT5Available,
      endpoint: this.gatewayEndpoint,
      cacheSize: this.promptCache.size,
      capabilities: [
        'dynamic_prompt_generation',
        'context_aware_prompts',
        'agent_specific_prompts',
        'fallback_prompt_generation'
      ]
    };
  }
} 