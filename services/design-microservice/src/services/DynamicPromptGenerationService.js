import logger from '../utils/logger.js';
import { LLMAgent } from './LLMAgent.js';

/**
 * Dynamic Prompt Generation using Gemini
 * Generates context-aware, dynamic prompts for various use cases
 */
export class DynamicPromptGenerationService {
  constructor() {
    this.llmAgent = new LLMAgent();
    this.promptCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Available agents and their skills
    this.availableAgents = {
      projectManager: {
        skills: ['project planning', 'task breakdown', 'coordination', 'general problem solving'],
        description: 'Handles overall project management and task coordination'
      },
      architectureDesigner: {
        skills: ['system design', 'architecture planning', 'scalability analysis', 'technical decision making'],
        description: 'Specializes in system architecture and technical design decisions'
      },
      casualConversation: {
        skills: ['user interaction', 'requirement gathering', 'general assistance'],
        description: 'Handles casual conversations and initial requirement gathering'
      }
    };
    
    logger.info('🎨 DynamicPromptGenerationService initialized with Gemini');
  }

  /**
   * MAIN FUNCTION: Generate dynamic prompt for any context
   */
  async generatePrompt(promptType, context = {}) {
    const cacheKey = `${promptType}_${JSON.stringify(context)}`;
    
    logger.info('🎯 [PROMPT GENERATION] Starting dynamic prompt generation:', {
      promptType,
      contextKeys: Object.keys(context)
    });
    
    // Check cache first
    if (this.promptCache.has(cacheKey)) {
      const cached = this.promptCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info('📦 [PROMPT CACHE] Using cached prompt:', {
          promptType,
          promptLength: cached.prompt.length
        });
        return cached.prompt;
      }
    }

    // Generate dynamic prompt using Gemini
    const generatedPrompt = await this.generateWithGemini(promptType, context);

    // Log the final generated prompt
    logger.info('✅ [PROMPT GENERATION] Generated prompt successfully:', {
      promptType,
      promptLength: generatedPrompt.length
    });

    // Cache the result
    this.promptCache.set(cacheKey, {
      prompt: generatedPrompt,
      timestamp: Date.now()
    });

    return generatedPrompt;
  }

  /**
   * Generate prompt using Gemini model
   */
  async generateWithGemini(promptType, context) {
    try {
      const promptInstructions = this.buildPromptInstructions(promptType, context);
      
      // Create a dynamic system message based on prompt type
      const systemMessage = `You are an expert prompt engineer specializing in ${promptType} prompts. 
Your task is to generate a highly effective, context-aware prompt that will produce optimal results.
The prompt should be detailed, specific, and incorporate all relevant context while maintaining clarity and focus.`;

      const userMessage = `Generate a professional prompt for ${promptType} with the following details:

CONTEXT:
${JSON.stringify(context, null, 2)}

REQUIREMENTS:
${promptInstructions.requirements.join('\\n')}

CONSTRAINTS:
${promptInstructions.constraints.join('\\n')}

The generated prompt should:
1. Be highly specific to the context provided
2. Include clear expectations and deliverables
3. Maintain professional tone while being engaging
4. Guide towards structured, high-quality responses
5. Incorporate domain-specific terminology where appropriate

Please generate a prompt that fulfills these requirements while being dynamic and contextually relevant.`;

      const response = await this.llmAgent.generateText([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]);

      if (!response) {
        throw new Error('Failed to generate prompt with Gemini');
      }

      return response.trim();

    } catch (error) {
      logger.error('❌ [GEMINI PROMPT GENERATION] Failed to generate prompt:', error);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }
  }

  /**
   * Build instruction templates for prompt generation
   */
  buildPromptInstructions(promptType, context) {
    const instructions = {
      'agent_collaboration': {
        requirements: [
          `Generate a prompt for ${context.agentName} to collaborate on: ${context.task}`,
          'Establish clear expertise and role definition',
          'Specify collaboration objectives and expectations',
          'Include relevant technical context and requirements'
        ],
        constraints: [
          'Must be specific to agent expertise',
          'Include clear deliverables',
          'Professional yet engaging tone',
          'Focus on collaboration aspects'
        ]
      },

      'task_analysis': {
        requirements: [
          `Analyze task: ${context.userQuery}`,
          'Request comprehensive technical analysis',
          'Include complexity assessment guidelines',
          'Specify required output format'
        ],
        constraints: [
          'Structure analysis into clear sections',
          'Include technical depth appropriate for complexity',
          'Focus on actionable insights',
          'Request specific examples where relevant'
        ]
      },

      'architecture_design': {
        requirements: [
          `Design system: ${context.systemType || 'web application'}`,
          'Cover all key architectural aspects',
          'Address scalability and performance',
          'Include security considerations'
        ],
        constraints: [
          'Focus on modern architecture patterns',
          'Include cloud-native considerations',
          'Address integration points',
          'Consider future scalability'
        ]
      },

      'casual_conversation': {
        requirements: [
          'Create engaging conversation flow',
          'Maintain professional yet friendly tone',
          'Guide towards technical solutions naturally',
          'Include relevant context from user query'
        ],
        constraints: [
          'Keep tone warm and approachable',
          'Include subtle technical guidance',
          'Maintain conversation flow',
          'Allow for natural transitions'
        ]
      },

      'task_enhancement': {
        requirements: [
          'Analyze and enhance the task understanding',
          'Consider CPU model analysis results',
          'Determine required skills and complexity',
          'Generate structured JSON output'
        ],
        constraints: [
          'Must use CPU analysis as baseline',
          'Consider available agent capabilities',
          'Include confidence scoring',
          'Provide detailed reasoning',
          'Output in valid JSON format'
        ]
      },

      'agent_selection': {
        requirements: [
          'Analyze task requirements against available agent capabilities',
          'Consider task complexity and domain',
          'Match required skills with agent expertise',
          'Recommend optimal agent combination'
        ],
        constraints: [
          'Only select from available agents',
          'Consider agent workload balance',
          'Justify agent selection',
          'Include confidence scores'
        ],
        availableAgents: this.availableAgents
      }
    };

    // Enhance context with available agents for relevant prompt types
    if (['task_enhancement', 'agent_selection'].includes(promptType)) {
      context.availableAgents = this.availableAgents;
    }

    // Default instructions for unknown prompt types
    return instructions[promptType] || {
      requirements: [
        `Generate a professional prompt for ${promptType}`,
        'Include all relevant context',
        'Specify clear deliverables',
        'Maintain professional standards'
      ],
      constraints: [
        'Clear and concise language',
        'Professional tone',
        'Include specific requirements',
        'Focus on quality output'
      ]
    };
  }

  /**
   * Clear the prompt cache
   */
  clearCache() {
    this.promptCache.clear();
    logger.info('🧹 [PROMPT CACHE] Cache cleared');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      status: 'healthy',
      cacheSize: this.promptCache.size,
      lastCleared: this.lastCacheCleared
    };
  }
} 