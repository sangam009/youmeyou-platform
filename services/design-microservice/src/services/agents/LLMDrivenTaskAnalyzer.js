import logger from '../../utils/logger.js';
import { LLMAgent } from '../LLMAgent.js';

/**
 * LLM-Driven Task Analyzer
 * Uses LLM for intelligent task division, progress evaluation, and missing elements detection
 * NO MORE STATIC LOGIC - Everything is LLM-powered
 */
export class LLMDrivenTaskAnalyzer {
  constructor() {
    this.llmAgent = LLMAgent.getInstance();
    this.completionThreshold = 0.8; // 80% completion threshold
    logger.info('🧠 LLMDrivenTaskAnalyzer initialized with LLM-powered analysis');
  }

  /**
   * LLM-POWERED task division into subtasks
   */
  async divideTaskIntoSubtasks(userPrompt, context = {}) {
    try {
      logger.info('🤖 Using LLM for intelligent task division');
      
      const taskDivisionPrompt = `
As an expert project manager, divide this task into manageable sub-tasks:

TASK: "${userPrompt}"

CONTEXT: ${JSON.stringify(context, null, 2)}

Please divide the task into sub-tasks in this JSON format:
{
  "taskAnalysis": {
    "complexity": 0.7,
    "estimatedEffort": "4 hours",
    "requiredSkills": ["skill1", "skill2"]
  },
  "subTasks": [
    {
      "id": "task-1",
      "title": "specific sub-task",
      "description": "detailed description",
      "estimatedEffort": "1 hour",
      "dependencies": [],
      "assignedTo": "agent type"
    }
  ],
  "executionOrder": ["task-1", "task-2"],
  "successMetrics": ["metric1", "metric2"]
}

Available agents: projectManager, techLead, architectureDesigner, databaseDesigner, apiDesigner, codeGenerator

Focus on creating actionable, specific tasks that can be executed independently.
`;

      const response = await this.llmAgent.execute(taskDivisionPrompt, {
        type: 'task_division',
        context
      });

      return this.parseTaskDivisionResponse(response.content);
      
    } catch (error) {
      logger.error('❌ LLM task division failed:', error);
      return this.fallbackTaskDivision(userPrompt);
    }
  }

  /**
   * LLM-POWERED progress evaluation - evaluates if task is 80% complete
   */
  async evaluateTaskProgress(taskResponse, originalPrompt, context = {}) {
    try {
      logger.info('🤖 Using LLM for intelligent progress evaluation');
      
      const progressEvaluationPrompt = `
As an expert project manager, evaluate if this task response meets the original requirements:

ORIGINAL REQUEST: "${originalPrompt}"

TASK RESPONSE: "${taskResponse}"

CONTEXT: ${JSON.stringify(context, null, 2)}

Please evaluate the completion percentage and provide detailed analysis in this JSON format:
{
  "completionScore": 0.85,
  "evaluation": {
    "requirementsMet": ["req1", "req2"],
    "requirementsMissing": ["req3", "req4"],
    "qualityScore": 0.9,
    "accuracyScore": 0.8
  },
  "missingElements": [
    {
      "element": "specific missing component",
      "importance": "high|medium|low",
      "description": "why it's missing and what's needed"
    }
  ],
  "nextSteps": [
    {
      "action": "specific action needed",
      "priority": "high|medium|low",
      "estimatedEffort": "time estimate"
    }
  ],
  "isComplete": true|false,
  "confidence": 0.9
}

Be thorough and specific. A task is considered complete at 80% or higher.
`;

      const response = await this.llmAgent.execute(progressEvaluationPrompt, {
        type: 'progress_evaluation',
        context
      });

      return this.parseProgressEvaluationResponse(response.content);
      
    } catch (error) {
      logger.error('❌ LLM progress evaluation failed:', error);
      return this.fallbackProgressEvaluation(taskResponse);
    }
  }

  /**
   * LLM-POWERED missing elements detection
   */
  async detectMissingElements(taskResponse, originalPrompt, context = {}) {
    try {
      logger.info('🤖 Using LLM for missing elements detection');
      
      const missingElementsPrompt = `
As an expert system analyst, identify what elements are missing from this response:

ORIGINAL REQUEST: "${originalPrompt}"

CURRENT RESPONSE: "${taskResponse}"

CONTEXT: ${JSON.stringify(context, null, 2)}

Please identify missing elements in this JSON format:
{
  "missingElements": [
    {
      "element": "specific missing component",
      "category": "technical|business|user|security|performance",
      "importance": "critical|high|medium|low",
      "description": "detailed description of what's missing",
      "impact": "what happens if this is missing",
      "suggestion": "how to address this missing element"
    }
  ],
  "completenessScore": 0.75,
  "criticalGaps": ["gap1", "gap2"],
  "recommendations": ["rec1", "rec2"]
}

Focus on identifying gaps that would prevent the solution from being complete or functional.
`;

      const response = await this.llmAgent.execute(missingElementsPrompt, {
        type: 'missing_elements',
        context
      });

      return this.parseMissingElementsResponse(response.content);
      
    } catch (error) {
      logger.error('❌ LLM missing elements detection failed:', error);
      return this.fallbackMissingElementsDetection(taskResponse);
    }
  }

  /**
   * LLM-POWERED follow-up prompt generation
   */
  async generateFollowUpPrompt(missingElements, originalPrompt, context = {}) {
    try {
      logger.info('🤖 Using LLM for follow-up prompt generation');
      
      const followUpPrompt = `
Based on the missing elements, generate a specific follow-up prompt to complete the task:

ORIGINAL REQUEST: "${originalPrompt}"

MISSING ELEMENTS: ${JSON.stringify(missingElements, null, 2)}

CONTEXT: ${JSON.stringify(context, null, 2)}

Generate a follow-up prompt that:
1. Addresses the most critical missing elements first
2. Is specific and actionable
3. Builds upon the existing response
4. Focuses on completing the task to 80% or higher

Provide the follow-up prompt in this JSON format:
{
  "followUpPrompt": "specific, actionable prompt",
  "priority": "high|medium|low",
  "expectedOutcome": "what this should achieve",
  "estimatedEffort": "time estimate"
}
`;

      const response = await this.llmAgent.execute(followUpPrompt, {
        type: 'follow_up_generation',
        context
      });

      return this.parseFollowUpPromptResponse(response.content);
      
    } catch (error) {
      logger.error('❌ LLM follow-up prompt generation failed:', error);
      return this.fallbackFollowUpPrompt(missingElements);
    }
  }

  /**
   * Parse LLM response for task division
   */
  parseTaskDivisionResponse(llmResponse) {
    try {
      // Extract JSON from LLM response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        taskAnalysis: parsed.taskAnalysis || {},
        subTasks: parsed.subTasks || [],
        executionOrder: parsed.executionOrder || [],
        successMetrics: parsed.successMetrics || [],
        source: 'llm-analysis'
      };
      
    } catch (error) {
      logger.error('❌ Failed to parse task division response:', error);
      return this.fallbackTaskDivision();
    }
  }

  /**
   * Parse LLM response for progress evaluation
   */
  parseProgressEvaluationResponse(llmResponse) {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        completionScore: parsed.completionScore || 0.5,
        evaluation: parsed.evaluation || {},
        missingElements: parsed.missingElements || [],
        nextSteps: parsed.nextSteps || [],
        isComplete: parsed.isComplete || false,
        confidence: parsed.confidence || 0.5,
        source: 'llm-evaluation'
      };
      
    } catch (error) {
      logger.error('❌ Failed to parse progress evaluation response:', error);
      return this.fallbackProgressEvaluation();
    }
  }

  /**
   * Parse LLM response for missing elements
   */
  parseMissingElementsResponse(llmResponse) {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        missingElements: parsed.missingElements || [],
        completenessScore: parsed.completenessScore || 0.5,
        criticalGaps: parsed.criticalGaps || [],
        recommendations: parsed.recommendations || [],
        source: 'llm-analysis'
      };
      
    } catch (error) {
      logger.error('❌ Failed to parse missing elements response:', error);
      return this.fallbackMissingElementsDetection();
    }
  }

  /**
   * Parse LLM response for follow-up prompt
   */
  parseFollowUpPromptResponse(llmResponse) {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        followUpPrompt: parsed.followUpPrompt || '',
        priority: parsed.priority || 'medium',
        expectedOutcome: parsed.expectedOutcome || '',
        estimatedEffort: parsed.estimatedEffort || 'unknown',
        source: 'llm-generation'
      };
      
    } catch (error) {
      logger.error('❌ Failed to parse follow-up prompt response:', error);
      return this.fallbackFollowUpPrompt();
    }
  }

  /**
   * Fallback methods when LLM fails
   */
  fallbackTaskDivision(userPrompt = '') {
    logger.warn('🔄 Using fallback task division');
    return {
      taskAnalysis: {
        complexity: 'medium',
        estimatedDuration: '1-2 hours',
        requiredSkills: ['general'],
        riskLevel: 'medium'
      },
      subTasks: [{
        id: 'task-1',
        title: 'General task execution',
        description: 'Execute the requested task',
        agent: 'projectManager',
        priority: 'high',
        dependencies: [],
        estimatedTime: '1 hour',
        deliverables: ['task completion'],
        acceptanceCriteria: ['task completed']
      }],
      executionOrder: ['task-1'],
      successMetrics: ['task completed'],
      source: 'fallback'
    };
  }

  fallbackProgressEvaluation(taskResponse = '') {
    logger.warn('🔄 Using fallback progress evaluation');
    return {
      completionScore: 0.6,
      evaluation: {
        requirementsMet: ['basic response'],
        requirementsMissing: ['detailed analysis'],
        qualityScore: 0.5,
        accuracyScore: 0.5
      },
      missingElements: [{
        element: 'detailed analysis',
        importance: 'medium',
        description: 'Need more detailed response'
      }],
      nextSteps: [{
        action: 'Provide more details',
        priority: 'medium',
        estimatedEffort: '30 minutes'
      }],
      isComplete: false,
      confidence: 0.5,
      source: 'fallback'
    };
  }

  fallbackMissingElementsDetection(taskResponse = '') {
    logger.warn('🔄 Using fallback missing elements detection');
    return {
      missingElements: [{
        element: 'detailed implementation',
        category: 'technical',
        importance: 'medium',
        description: 'Need more specific technical details',
        impact: 'Solution may not be complete',
        suggestion: 'Ask for more specific technical requirements'
      }],
      completenessScore: 0.6,
      criticalGaps: ['detailed implementation'],
      recommendations: ['Request more specific details'],
      source: 'fallback'
    };
  }

  fallbackFollowUpPrompt(missingElements = []) {
    logger.warn('🔄 Using fallback follow-up prompt');
    return {
      followUpPrompt: 'Please provide more specific details about your requirements.',
      priority: 'medium',
      expectedOutcome: 'More detailed response',
      estimatedEffort: '30 minutes',
      source: 'fallback'
    };
  }
} 