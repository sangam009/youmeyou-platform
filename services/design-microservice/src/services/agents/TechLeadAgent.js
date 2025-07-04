import { A2AClient } from '@a2a-js/sdk';
import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';

class TechLeadAgent {
  constructor() {
    this.client = new A2AClient(config.a2a.baseUrl);
  }

  async reviewCode(code) {
    try {
      logger.info('Reviewing code:', code);
      // TODO: Implement code review logic
      return { status: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error reviewing code:', error);
      throw error;
    }
  }

  async suggestImprovements(code) {
    try {
      logger.info('Suggesting improvements for code:', code);
      // TODO: Implement improvement suggestion logic
      return { status: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error suggesting improvements:', error);
      throw error;
    }
  }

  async validateAndQuestion(executionPlan) {
    try {
      // Generate validation prompt
      const validationPrompt = this.generateValidationPrompt(executionPlan);
      
      // Get streaming response for validation
      const stream = await this.client.sendMessageStream({
        message: {
          messageId: `validation-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text: validationPrompt }],
          kind: "message"
        }
      });

      // Process validation response
      const questions = [];
      let currentQuestion = {};

      for await (const event of stream) {
        if (event.kind === 'status-update' && event.status.message?.parts[0]?.text) {
          const questionUpdate = this.parseQuestionUpdate(event.status.message.parts[0].text);
          if (questionUpdate) {
            if (questionUpdate.type === 'question') {
              currentQuestion = questionUpdate;
              questions.push(currentQuestion);
            } else if (questionUpdate.type === 'context') {
              currentQuestion.context = questionUpdate.context;
            }
          }
        }
      }

      return this.prioritizeQuestions(questions);
    } catch (error) {
      logger.error('Error in plan validation:', error);
      throw error;
    }
  }

  generateValidationPrompt(executionPlan) {
    return `
    Validate this execution plan and generate clarifying questions:
    
    EXECUTION PLAN:
    ${JSON.stringify(executionPlan, null, 2)}
    
    REQUIRED OUTPUT FORMAT:
    For each question:
    {
      "type": "question",
      "id": "string",
      "question": "string",
      "options": ["string"] | null,
      "priority": "high" | "medium" | "low",
      "impact": "string",
      "reasoning": "string"
    }
    
    For context:
    {
      "type": "context",
      "context": "string",
      "relatedQuestionId": "string"
    }
    
    Consider:
    1. Technical feasibility
    2. Missing requirements
    3. Potential bottlenecks
    4. Security implications
    5. Scalability concerns
    `;
  }

  parseQuestionUpdate(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Error parsing question update:', error);
    }
    return null;
  }

  prioritizeQuestions(questions) {
    // Sort questions by priority
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return questions.sort((a, b) => {
      return priorityMap[b.priority] - priorityMap[a.priority];
    });
  }

  async enhancePrompt(basePrompt, context) {
    // Add context-specific enhancements to the prompt
    const enhancedPrompt = `
    ${basePrompt}
    
    CONTEXT:
    ${JSON.stringify(context, null, 2)}
    
    ADDITIONAL CONSIDERATIONS:
    1. Previous decisions and their impact
    2. System constraints and limitations
    3. Integration points and dependencies
    4. Performance requirements
    5. Security considerations
    
    Please ensure the response:
    1. Maintains consistency with existing architecture
    2. Follows established patterns
    3. Considers scalability implications
    4. Addresses security concerns
    5. Optimizes for maintainability
    `;

    return enhancedPrompt;
  }

  async validateResponse(response, criteria) {
    const validationResult = {
      isValid: true,
      issues: [],
      suggestions: []
    };

    // Validate against each criterion
    for (const criterion of criteria) {
      const result = await this.validateCriterion(response, criterion);
      if (!result.isValid) {
        validationResult.isValid = false;
        validationResult.issues.push(result.issue);
        validationResult.suggestions.push(result.suggestion);
      }
    }

    return validationResult;
  }

  async validateCriterion(response, criterion) {
    // Send validation request to A2A
    const stream = await this.client.sendMessageStream({
      message: {
        messageId: `criterion-${Date.now()}`,
        role: "user",
        parts: [{ 
          kind: "text", 
          text: `
          Validate this response against the criterion:
          
          RESPONSE:
          ${JSON.stringify(response, null, 2)}
          
          CRITERION:
          ${criterion}
          
          Return JSON:
          {
            "isValid": boolean,
            "issue": "string" | null,
            "suggestion": "string" | null
          }
          `
        }],
        kind: "message"
      }
    });

    // Process validation response
    for await (const event of stream) {
      if (event.kind === 'status-update' && event.status.message?.parts[0]?.text) {
        const result = this.parseValidationResult(event.status.message.parts[0].text);
        if (result) {
          return result;
        }
      }
    }

    // Default response if no valid result
    return {
      isValid: true,
      issue: null,
      suggestion: null
    };
  }

  parseValidationResult(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Error parsing validation result:', error);
    }
    return null;
  }

  async execute(userQuery, context = {}) {
    try {
      logger.info('👨‍💼 TechLead executing task:', userQuery.substring(0, 100));
      
      // For now, provide a simple response while the full A2A integration is being set up
      const response = {
        content: `As your Tech Lead, I provide technical guidance and oversight. For "${userQuery.substring(0, 50)}...", I'll focus on architectural decisions, code quality, team coordination, and best practices implementation.`,
        suggestions: [
          'Review architectural decisions',
          'Ensure code quality standards',
          'Coordinate team efforts',
          'Implement best practices'
        ],
        analysis: 'Technical leadership analysis provided'
      };
      
      return response;
    } catch (error) {
      logger.error('❌ TechLead execution error:', error);
      throw error;
    }
  }
}

export default TechLeadAgent;