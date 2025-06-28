import { A2AClient } from '@a2a-js/sdk';
import { config } from '/app/config/index.js';
import logger from '/app/src/utils/logger.js';
import ArchitectureDesignerAgent from '/app/src/services/agents/ArchitectureDesignerAgent.js';
import DatabaseDesignerAgent from '/app/src/services/agents/DatabaseDesignerAgent.js';
import APIDesignerAgent from '/app/src/services/agents/APIDesignerAgent.js';
import CodeGeneratorAgent from '/app/src/services/agents/CodeGeneratorAgent.js';

class AgentOrchestrator {
  constructor() {
    this.a2aClient = new A2AClient({
      timeout: config.api.requestTimeout,
      streamTimeout: config.api.streamTimeout
    });

    // Initialize all agents
    this.architectureDesigner = new ArchitectureDesignerAgent(this.a2aClient);
    this.databaseDesigner = new DatabaseDesignerAgent(this.a2aClient);
    this.apiDesigner = new APIDesignerAgent(this.a2aClient);
    this.codeGenerator = new CodeGeneratorAgent(this.a2aClient);
    
    // Task-to-model mapping
    this.taskModelMap = config.tasks;
  }

  async orchestrateTask(task, context) {
    try {
      logger.info('Starting task orchestration:', task.type);

      switch (task.type) {
        case 'ARCHITECTURE_DESIGN':
          return await this.handleArchitectureDesign(task, context);
        case 'DATABASE_DESIGN':
          return await this.handleDatabaseDesign(task, context);
        case 'API_DESIGN':
          return await this.handleAPIDesign(task, context);
        case 'CODE_GENERATION':
          return await this.handleCodeGeneration(task, context);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error in task orchestration:', error);
      throw error;
    }
  }

  async handleArchitectureDesign(task, context) {
    // Use Gemini for complex architecture design
    const result = await this.architectureDesigner.analyzeArchitecture(
      task.requirements,
      context
    );

    // Generate diagrams and documentation
    const diagram = await this.architectureDesigner.generateArchitectureDiagram(result.design);
    const scalability = await this.architectureDesigner.analyzeScalability(result.design);
    const optimizations = await this.architectureDesigner.suggestOptimizations(result.design, scalability);

    return {
      ...result,
      diagram,
      scalability,
      optimizations
    };
  }

  async handleDatabaseDesign(task, context) {
    // Use hybrid approach for database design
    const result = await this.databaseDesigner.designDatabase(
      task.requirements,
      context
    );

    // Generate additional artifacts
    const erDiagram = await this.databaseDesigner.generateERDiagram(result.schema);
    const indexing = await this.databaseDesigner.generateIndexingStrategy(
      result.schema,
      result.optimization
    );

    // If migration is needed
    let migrationPlan = null;
    if (task.currentSchema) {
      migrationPlan = await this.databaseDesigner.analyzeMigrationPath(
        task.currentSchema,
        result.schema
      );
    }

    // Validate the schema
    const validation = await this.databaseDesigner.validateSchema(result.schema);

    // Get optimization suggestions
    const optimizations = await this.databaseDesigner.suggestOptimizations(
      result.schema,
      result.optimization,
      context.performance
    );

    return {
      ...result,
      erDiagram,
      indexing,
      migrationPlan,
      validation,
      optimizations
    };
  }

  async handleAPIDesign(task, context) {
    // Use API Designer Agent for endpoint design
    const result = await this.apiDesigner.designAPI(
      task.requirements,
      context
    );

    // Generate additional artifacts
    const mockData = await this.apiDesigner.generateMockData(result.endpoints);
    const validation = await this.apiDesigner.validateAPIDesign(
      result.endpoints,
      result.authFlow
    );

    // Generate client SDKs if requested
    let clientSDKs = {};
    if (task.generateSDKs) {
      for (const language of task.sdkLanguages) {
        clientSDKs[language] = await this.apiDesigner.generateClientSDK(
          result.endpoints,
          language
        );
      }
    }

    return {
      ...result,
      mockData,
      validation,
      clientSDKs
    };
  }

  async handleCodeGeneration(task, context) {
    // Use Code Generator Agent for implementation
    const result = await this.codeGenerator.generateCode(
      task.requirements,
      context
    );

    // Perform additional code-related tasks
    const optimizedCode = await this.codeGenerator.optimizeCode(
      result.code,
      task.performance
    );
    const refactoringPlan = await this.codeGenerator.generateRefactoringPlan(
      result.code,
      result.analysis
    );
    const qualityValidation = await this.codeGenerator.validateCodeQuality(
      result.code
    );

    return {
      ...result,
      optimizedCode,
      refactoringPlan,
      qualityValidation
    };
  }

  getModelForTask(taskType) {
    const model = this.taskModelMap[taskType];
    if (!model) {
      throw new Error(`No model configured for task type: ${taskType}`);
    }
    return model;
  }

  async validateTaskCompletion(task, result) {
    try {
      // Validate task results based on type
      switch (task.type) {
        case 'ARCHITECTURE_DESIGN':
          return this.validateArchitectureDesign(result);
        case 'DATABASE_DESIGN':
          return this.validateDatabaseDesign(result);
        case 'API_DESIGN':
          return this.validateAPIDesign(result);
        case 'CODE_GENERATION':
          return this.validateCodeGeneration(result);
        default:
          throw new Error(`Unknown task type for validation: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error in task validation:', error);
      throw error;
    }
  }

  validateArchitectureDesign(result) {
    return {
      isValid: true,
      hasRequiredComponents: result.design && result.documentation,
      hasOptionalComponents: result.diagram && result.scalability,
      qualityScore: this.calculateQualityScore(result)
    };
  }

  validateDatabaseDesign(result) {
    return {
      isValid: true,
      hasRequiredComponents: result.schema && result.documentation,
      hasOptionalComponents: result.erDiagram && result.optimization,
      qualityScore: this.calculateQualityScore(result)
    };
  }

  validateAPIDesign(result) {
    return {
      isValid: true,
      hasRequiredComponents: result.endpoints && result.documentation,
      hasOptionalComponents: result.mockData && result.clientSDKs,
      qualityScore: this.calculateQualityScore(result)
    };
  }

  validateCodeGeneration(result) {
    return {
      isValid: true,
      hasRequiredComponents: result.code && result.tests,
      hasOptionalComponents: result.optimizedCode && result.refactoringPlan,
      qualityScore: this.calculateQualityScore(result)
    };
  }

  calculateQualityScore(result) {
    // Implement quality scoring logic based on completeness and complexity
    const completeness = this.assessCompleteness(result);
    const complexity = this.assessComplexity(result);
    return (completeness + complexity) / 2;
  }

  assessCompleteness(result) {
    // Count the number of non-null properties
    const totalProps = Object.keys(result).length;
    const nonNullProps = Object.values(result).filter(v => v !== null).length;
    return (nonNullProps / totalProps) * 100;
  }

  assessComplexity(result) {
    // Assess the complexity of the solution
    // This is a simplified implementation
    return 85; // Default good score
  }
}

export default AgentOrchestrator;