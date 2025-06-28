const { A2AClient } = require('@a2a-js/sdk');
const { config } = require('../../../config');
const logger = require('../../utils/logger');

class CodeGeneratorAgent {
  constructor(a2aClient) {
    this.a2aClient = a2aClient;
    this.modelEndpoints = {
      gemini: config.api.geminiEndpoint,
      flanT5: config.api.flanT5Endpoint,
      codebert: config.api.codebertEndpoint,
      distilbert: config.api.distilbertEndpoint
    };
  }

  async generateCode(requirements, context) {
    try {
      // 1. Initial Analysis with DistilBERT
      const initialAnalysis = await this.analyzeRequirements(requirements);

      // 2. Implementation Pattern Selection with CodeBERT
      const patterns = await this.selectImplementationPatterns(requirements, initialAnalysis);

      // 3. Code Generation with Gemini
      const code = await this.generateImplementation(requirements, patterns, context);

      // 4. Test Generation with CodeBERT
      const tests = await this.generateTests(code);

      // 5. Documentation Generation with FLAN-T5
      const documentation = await this.generateDocumentation(code, tests);

      // 6. Code Review with CodeBERT
      const review = await this.performCodeReview(code);

      return {
        analysis: initialAnalysis,
        patterns,
        code,
        tests,
        documentation,
        review
      };
    } catch (error) {
      logger.error('Error in code generation:', error);
      throw error;
    }
  }

  async analyzeRequirements(requirements) {
    // Use DistilBERT for initial requirement analysis
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.distilbert,
      message: {
        role: "system",
        content: [
          "Analyze code generation requirements for:",
          "1. Technical requirements",
          "2. Dependencies",
          "3. Constraints",
          "4. Performance needs",
          `Requirements: ${requirements}`
        ].join('\n')
      }
    });
    return response.analysis;
  }

  async selectImplementationPatterns(requirements, analysis) {
    // Use CodeBERT for pattern selection
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.codebert,
      message: {
        role: "system",
        content: [
          "Select implementation patterns for:",
          "1. Design patterns",
          "2. Architecture patterns",
          "3. Best practices",
          "4. Common solutions",
          `Requirements: ${requirements}`,
          `Analysis: ${JSON.stringify(analysis)}`
        ].join('\n')
      }
    });
    return response.patterns;
  }

  async generateImplementation(requirements, patterns, context) {
    // Use Gemini for code generation
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: [
          "Generate implementation code with:",
          "1. Clean code principles",
          "2. Error handling",
          "3. Logging",
          "4. Performance optimization",
          `Requirements: ${requirements}`,
          `Patterns: ${JSON.stringify(patterns)}`,
          `Context: ${JSON.stringify(context)}`
        ].join('\n')
      }
    });

    let code = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        code += chunk.content;
      }
    }
    return code;
  }

  async generateTests(code) {
    // Use CodeBERT for test generation
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.codebert,
      message: {
        role: "system",
        content: [
          "Generate comprehensive tests for:",
          "1. Unit tests",
          "2. Integration tests",
          "3. Edge cases",
          "4. Error scenarios",
          `Code: ${code}`
        ].join('\n')
      }
    });
    return response.tests;
  }

  async generateDocumentation(code, tests) {
    // Use FLAN-T5 for documentation generation
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.flanT5,
      message: {
        role: "system",
        content: [
          "Generate code documentation for:",
          `Code: ${code}`,
          `Tests: ${tests}`,
          "Include:",
          "1. API documentation",
          "2. Usage examples",
          "3. Setup instructions",
          "4. Testing guide"
        ].join('\n')
      }
    });
    return response.documentation;
  }

  async performCodeReview(code) {
    // Use CodeBERT for code review
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.codebert,
      message: {
        role: "system",
        content: [
          "Review code for:",
          "1. Code quality",
          "2. Best practices",
          "3. Performance issues",
          "4. Security concerns",
          `Code: ${code}`
        ].join('\n')
      }
    });
    return response.review;
  }

  async optimizeCode(code, performance) {
    // Use Gemini for code optimization
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: [
          "Optimize code for:",
          "1. Performance",
          "2. Memory usage",
          "3. Resource utilization",
          "4. Scalability",
          `Code: ${code}`,
          `Performance Metrics: ${performance}`
        ].join('\n')
      }
    });

    let optimizedCode = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        optimizedCode += chunk.content;
      }
    }
    return optimizedCode;
  }

  async generateRefactoringPlan(code, analysis) {
    // Use Gemini for refactoring planning
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: [
          "Generate refactoring plan for:",
          "1. Code structure",
          "2. Design patterns",
          "3. Maintainability",
          "4. Technical debt",
          `Code: ${code}`,
          `Analysis: ${JSON.stringify(analysis)}`
        ].join('\n')
      }
    });

    let plan = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        plan += chunk.content;
      }
    }
    return plan;
  }

  async validateCodeQuality(code) {
    // Use CodeBERT for code quality validation
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.codebert,
      message: {
        role: "system",
        content: [
          "Validate code quality for:",
          "1. Code standards",
          "2. Complexity metrics",
          "3. Maintainability index",
          "4. Technical debt",
          `Code: ${code}`
        ].join('\n')
      }
    });
    return response.validation;
  }
}

module.exports = CodeGeneratorAgent;