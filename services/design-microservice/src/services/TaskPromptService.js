import logger from '../utils/logger.js';
import { SimpleGeminiService } from './SimpleGeminiService.js';

/**
 * Task Prompt Service - Divides complex technical prompts into manageable sub-prompts
 */
export class TaskPromptService {
  constructor() {
    this.geminiService = new SimpleGeminiService();
    this.maxSubPrompts = 5;
    
    logger.info('🔄 TaskPromptService initialized');
  }

  /**
   * Divide technical prompt into sub-prompts
   */
  async divideIntoSubPrompts(prompt, context = {}) {
    try {
      const divisionPrompt = `
Analyze this technical prompt and divide it into logical sub-tasks. Each sub-task should be actionable and focused on a specific aspect of the request.

Original Prompt: "${prompt}"

Context: ${JSON.stringify(context, null, 2)}

Please divide this into 2-5 sub-prompts that build upon each other. Each sub-prompt should:
1. Be specific and actionable
2. Include relevant context from the original prompt
3. Be suitable for implementation by an AI assistant
4. Build logically upon previous sub-prompts

Return your response in this exact JSON format:
{
  "subPrompts": [
    {
      "id": "task_1",
      "title": "Brief title for the task",
      "prompt": "Detailed prompt for this specific task",
      "priority": 1,
      "dependencies": [],
      "expectedOutput": "Description of what this task should produce"
    }
  ],
  "executionStrategy": "sequential" or "parallel",
  "totalEstimatedTime": "estimated time in minutes"
}

IMPORTANT: Only return the JSON object, nothing else.
`;

      logger.info('🔄 Dividing prompt into sub-prompts:', { 
        promptLength: prompt.length,
        contextKeys: Object.keys(context)
      });

      if (!this.geminiService.initialized) {
        await this.geminiService.initialize();
      }

      const result = await this.geminiService.model.generateContent(divisionPrompt);
      const responseText = result.response.text().trim();
      
      // Try to extract JSON from response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const subPromptData = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!subPromptData.subPrompts || !Array.isArray(subPromptData.subPrompts)) {
        throw new Error('Invalid sub-prompts structure');
      }

      // Limit number of sub-prompts
      if (subPromptData.subPrompts.length > this.maxSubPrompts) {
        subPromptData.subPrompts = subPromptData.subPrompts.slice(0, this.maxSubPrompts);
      }

      // Add sequence numbers and ensure proper structure
      subPromptData.subPrompts = subPromptData.subPrompts.map((subPrompt, index) => ({
        id: subPrompt.id || `task_${index + 1}`,
        title: subPrompt.title || `Task ${index + 1}`,
        prompt: subPrompt.prompt,
        priority: subPrompt.priority || (index + 1),
        dependencies: subPrompt.dependencies || [],
        expectedOutput: subPrompt.expectedOutput || 'Task completion',
        sequence: index + 1,
        status: 'pending'
      }));

      logger.info('✅ Successfully divided prompt into sub-prompts:', {
        count: subPromptData.subPrompts.length,
        strategy: subPromptData.executionStrategy
      });

      return {
        success: true,
        data: subPromptData,
        originalPrompt: prompt
      };

    } catch (error) {
      logger.error('❌ Failed to divide prompt into sub-prompts:', error);
      
      // Return original prompt as single sub-prompt on failure
      return {
        success: false,
        data: {
          subPrompts: [{
            id: 'task_1',
            title: 'Complete Task',
            prompt: prompt,
            priority: 1,
            dependencies: [],
            expectedOutput: 'Task completion',
            sequence: 1,
            status: 'pending'
          }],
          executionStrategy: 'sequential',
          totalEstimatedTime: '5-10 minutes'
        },
        originalPrompt: prompt,
        error: error.message
      };
    }
  }

  /**
   * Process a single sub-prompt with context
   */
  async processSubPrompt(subPrompt, allSubPrompts, completedResults = [], canvasState = {}) {
    try {
      // Build context from completed results
      const contextInfo = completedResults.length > 0 
        ? `\n\nContext from previous tasks:\n${completedResults.map(r => `- ${r.title}: ${r.result.slice(0, 200)}...`).join('\n')}`
        : '';

      // Build canvas context
      const canvasContext = Object.keys(canvasState).length > 0 
        ? `\n\nCurrent Canvas State:\n${JSON.stringify(canvasState, null, 2)}`
        : '';

      const enhancedPrompt = `
${subPrompt.prompt}

${contextInfo}

${canvasContext}

IMPORTANT: When updating or creating architecture components, include ACTION blocks in your response using this format:
ACTION: {"type": "add_component", "data": {"name": "Component Name", "type": "component_type", "properties": {...}}}

For canvas updates, use:
ACTION: {"type": "canvas_update", "data": {"title": "Updated Title", "description": "Updated Description"}}

Please provide a comprehensive response that includes both explanatory text and any necessary actions.
`;

      logger.info('🔄 Processing sub-prompt:', {
        id: subPrompt.id,
        title: subPrompt.title,
        hasContext: contextInfo.length > 0,
        hasCanvasState: Object.keys(canvasState).length > 0
      });

      return {
        success: true,
        subPrompt,
        enhancedPrompt,
        contextProvided: contextInfo.length > 0
      };

    } catch (error) {
      logger.error('❌ Failed to process sub-prompt:', error);
      return {
        success: false,
        subPrompt,
        error: error.message
      };
    }
  }

  /**
   * Get execution order based on dependencies
   */
  getExecutionOrder(subPrompts) {
    const ordered = [];
    const completed = new Set();
    const remaining = [...subPrompts];

    while (remaining.length > 0) {
      const ready = remaining.filter(sp => 
        sp.dependencies.length === 0 || 
        sp.dependencies.every(dep => completed.has(dep))
      );

      if (ready.length === 0) {
        // Circular dependency or invalid dependency - use remaining order
        ordered.push(...remaining);
        break;
      }

      // Add ready tasks to execution order
      ready.forEach(task => {
        ordered.push(task);
        completed.add(task.id);
        const index = remaining.indexOf(task);
        if (index > -1) {
          remaining.splice(index, 1);
        }
      });
    }

    return ordered;
  }
}

export default TaskPromptService; 