import logger from '../../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

class ProjectManagerAgent {
  constructor(config = {}) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.systemPrompt = `You are an expert Project Manager Agent specializing in AI development platform orchestration.
    Your role is to analyze user requests, create execution plans, and coordinate specialist agents.
    
    Key responsibilities:
    1. Deep request analysis and complexity assessment
    2. Dynamic execution plan generation
    3. Specialist agent selection and coordination
    4. Real-time progress monitoring and adjustment
    
    Always provide structured, actionable plans with clear reasoning.`;
  }

  async analyzeRequest(request) {
    try {
      const prompt = `
      Analyze the following user request and break it down into structured components:
      "${request}"
      
      Provide analysis in the following format:
      1. Request Type (e.g., canvas-building, code-generation, architecture-design)
      2. Complexity Level (1-5)
      3. Required Skills
      4. Dependencies
      5. Estimated Time
      6. Required Agents
      7. Execution Strategy
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseAnalysis(response.text());
    } catch (error) {
      logger.error('Error analyzing request:', error);
      throw error;
    }
  }

  async generateExecutionPlan(analysis) {
    try {
      const prompt = `
      Based on this analysis, create a detailed execution plan:
      ${JSON.stringify(analysis, null, 2)}
      
      Generate a plan with:
      1. Sequential phases with dependencies
      2. Parallel execution opportunities
      3. Agent assignments
      4. Validation checkpoints
      5. Expected outcomes
      6. Risk mitigation strategies
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseExecutionPlan(response.text());
    } catch (error) {
      logger.error('Error generating execution plan:', error);
      throw error;
    }
  }

  async monitorProgress(executionPlan, progress) {
    try {
      const prompt = `
      Review the execution progress and suggest adjustments:
      
      Original Plan:
      ${JSON.stringify(executionPlan, null, 2)}
      
      Current Progress:
      ${JSON.stringify(progress, null, 2)}
      
      Provide:
      1. Progress Assessment
      2. Blockers/Issues
      3. Suggested Adjustments
      4. Next Steps
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseProgressReport(response.text());
    } catch (error) {
      logger.error('Error monitoring progress:', error);
      throw error;
    }
  }

  parseAnalysis(text) {
    // Implementation to parse the structured analysis
    const analysis = {
      requestType: '',
      complexityLevel: 0,
      requiredSkills: [],
      dependencies: [],
      estimatedTime: '',
      requiredAgents: [],
      executionStrategy: ''
    };

    // Extract information using regex or string parsing
    // This is a placeholder - implement proper parsing logic
    
    return analysis;
  }

  parseExecutionPlan(text) {
    // Implementation to parse the execution plan
    const plan = {
      phases: [],
      parallelExecutions: [],
      agentAssignments: {},
      validationPoints: [],
      expectedOutcomes: [],
      riskMitigation: []
    };

    // Extract information using regex or string parsing
    // This is a placeholder - implement proper parsing logic
    
    return plan;
  }

  parseProgressReport(text) {
    // Implementation to parse the progress report
    const report = {
      progressAssessment: '',
      blockers: [],
      suggestedAdjustments: [],
      nextSteps: []
    };

    // Extract information using regex or string parsing
    // This is a placeholder - implement proper parsing logic
    
    return report;
  }

  async analyzeTask(task) {
    try {
      // Generate dynamic analysis prompt
      const analysisPrompt = await this.generateAnalysisPrompt(task);
      
      // Get streaming response from A2A
      const stream = await this.a2aClient.sendMessageStream({
        message: {
          messageId: `analysis-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text: analysisPrompt }],
          kind: "message"
        }
      });

      // Process streaming response
      let executionPlan = {
        phases: [],
        totalEstimatedTime: 0,
        totalEstimatedCost: 0
      };

      for await (const event of stream) {
        if (event.kind === 'status-update' && event.status.message?.parts[0]?.text) {
          const planUpdate = this.parsePlanUpdate(event.status.message.parts[0].text);
          if (planUpdate) {
            executionPlan = { ...executionPlan, ...planUpdate };
          }
        }
      }

      return this.validateAndEnhancePlan(executionPlan);
    } catch (error) {
      logger.error('Error in task analysis:', error);
      throw error;
    }
  }

  async generateAnalysisPrompt(task) {
    return `
    Analyze this development task and create a detailed execution plan:
    
    TASK: ${task.description || task}
    
    REQUIRED OUTPUT FORMAT:
    {
      "phases": [
        {
          "id": "string",
          "name": "string",
          "agent": "string",
          "action": "string",
          "priority": number,
          "canModify": boolean,
          "estimatedTime": "string",
          "dependencies": ["string"],
          "parallelizable": boolean
        }
      ],
      "totalEstimatedTime": "string",
      "totalEstimatedCost": "string",
      "complexity": number,
      "risks": ["string"],
      "requiredSkills": ["string"]
    }
    
    Consider:
    1. Task complexity and dependencies
    2. Required specialist agents
    3. Parallel execution opportunities
    4. Risk factors and mitigation
    5. Cost optimization
    `;
  }

  parsePlanUpdate(text) {
    try {
      // Find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Error parsing plan update:', error);
    }
    return null;
  }

  async validateAndEnhancePlan(plan) {
    // Ensure all required fields exist
    if (!plan.phases || !Array.isArray(plan.phases)) {
      plan.phases = [];
    }

    // Add missing fields and validate
    plan.phases = plan.phases.map((phase, index) => ({
      id: phase.id || `phase-${index}`,
      name: phase.name || `Phase ${index + 1}`,
      agent: phase.agent || 'general',
      action: phase.action || 'execute',
      priority: phase.priority || index + 1,
      canModify: phase.canModify !== false,
      estimatedTime: phase.estimatedTime || '60s',
      dependencies: phase.dependencies || [],
      parallelizable: phase.parallelizable || false
    }));

    // Calculate totals if missing
    if (!plan.totalEstimatedTime) {
      plan.totalEstimatedTime = this.calculateTotalTime(plan.phases);
    }
    if (!plan.totalEstimatedCost) {
      plan.totalEstimatedCost = this.calculateTotalCost(plan.phases);
    }

    return plan;
  }

  calculateTotalTime(phases) {
    // Simple time calculation for now
    const totalSeconds = phases.reduce((total, phase) => {
      const seconds = parseInt(phase.estimatedTime) || 60;
      return total + seconds;
    }, 0);
    return `${totalSeconds}s`;
  }

  calculateTotalCost(phases) {
    // Basic cost calculation ($0.01 per phase)
    return `$${(phases.length * 0.01).toFixed(2)}`;
  }

  async getPromptTemplate(type) {
    // Load prompt template based on type
    const templates = {
      analysis: 'Analyze the following task and break it down into steps...',
      architecture: 'Design an architecture for the following system...',
      implementation: 'Implement the following feature with these requirements...',
      testing: 'Create test cases for the following functionality...'
    };
    return templates[type] || templates.analysis;
  }
}

export default ProjectManagerAgent; 