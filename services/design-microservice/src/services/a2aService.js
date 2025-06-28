import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import ProjectManagerAgent from './agents/ProjectManagerAgent.js';
import TechLeadAgent from './agents/TechLeadAgent.js';
import { AgentOrchestrator } from './agents/AgentOrchestrator.js';

class A2AService {
  constructor() {
    // Initialize orchestrator and agents
    this.orchestrator = new AgentOrchestrator();
    this.projectManager = new ProjectManagerAgent();
    this.techLead = new TechLeadAgent();
  }

  async getAgentCard() {
    return {
      name: 'YouMeYou Design Agents',
      description: 'AI-powered system design and architecture agents for building complete applications',
      url: `http://localhost:${config.port}`,
      version: '1.0.0',
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true
      },
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain', 'application/json'],
      skills: [
        {
          id: 'architecture_design',
          name: 'Architecture Design',
          description: 'Design system architecture, component relationships, and scalability patterns',
          tags: ['architecture', 'system-design', 'scalability']
        },
        {
          id: 'database_design',
          name: 'Database Design',
          description: 'Design database schemas, optimize queries, and plan data models',
          tags: ['database', 'schema', 'optimization']
        },
        {
          id: 'api_design',
          name: 'API Design',
          description: 'Design RESTful APIs, authentication flows, and documentation',
          tags: ['api', 'rest', 'authentication']
        },
        {
          id: 'code_generation',
          name: 'Code Generation',
          description: 'Generate implementation code, tests, and documentation',
          tags: ['code', 'implementation', 'testing']
        },
        {
          id: 'project_management',
          name: 'Project Management',
          description: 'Break down projects into tasks, estimate timelines, and track progress',
          tags: ['project', 'planning', 'management']
        }
      ]
    };
  }

  async executeTask(taskId, task, context = {}) {
    try {
      logger.info(`Executing task ${taskId}`);

      // Analyze task and select appropriate agents
      const analysis = await this.orchestrator.analyzeTask(task.content);
      
      // Execute task with selected agents
      const result = await this.orchestrator.executeCoordinatedTask(
        analysis.selectedAgents,
        task.content,
        { ...context, ...analysis.context }
      );

      return {
        taskId,
        status: 'completed',
        result: result.results,
        metadata: {
          complexity: analysis.complexity,
          selectedAgents: analysis.selectedAgents,
          executionTime: Date.now() - analysis.startTime
        }
      };
    } catch (error) {
      logger.error(`Error executing task ${taskId}:`, error);
      throw error;
    }
  }

  async streamTask(taskId, task, context = {}) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue({
            type: 'status',
            status: 'started',
            message: 'Analyzing task requirements...'
          });

          // Analyze task
          const analysis = await this.orchestrator.analyzeTask(task.content);
          
          controller.enqueue({
            type: 'analysis',
            selectedAgents: analysis.selectedAgents,
            complexity: analysis.complexity
          });

          // Execute task with streaming
          const result = await this.orchestrator.executeCoordinatedTaskWithStreaming(
            analysis.selectedAgents,
            task.content,
            { ...context, ...analysis.context },
            (update) => {
              controller.enqueue({
                type: 'progress',
                ...update
              });
            }
          );

          // Send final result
          controller.enqueue({
            type: 'completed',
            result: result.results,
            metadata: {
              complexity: analysis.complexity,
              selectedAgents: analysis.selectedAgents,
              executionTime: Date.now() - analysis.startTime
            }
          });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return stream;
  }

  async getLocalAgents() {
    return [
      {
        id: 'project-manager',
        name: 'Project Manager Agent',
        skills: ['project_planning', 'task_breakdown', 'resource_allocation'],
        version: '1.0.0'
      },
      {
        id: 'tech-lead',
        name: 'Tech Lead Agent', 
        skills: ['architecture_review', 'code_review', 'technical_guidance'],
        version: '1.0.0'
      }
    ];
  }
}

export default A2AService;