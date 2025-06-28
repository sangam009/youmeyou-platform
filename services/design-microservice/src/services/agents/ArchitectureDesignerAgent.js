import { A2AClient } from '@a2a-js/sdk';
import { config } from '/app/config/index.js';
import logger from '/app/src/utils/logger.js';

class ArchitectureDesignerAgent {
  constructor(a2aClient) {
    this.a2aClient = a2aClient;
    this.modelEndpoints = {
      gemini: config.api.geminiEndpoint,
      flanT5: config.api.flanT5Endpoint,
      codebert: config.api.codebertEndpoint,
      distilbert: config.api.distilbertEndpoint
    };
  }

  async analyzeArchitecture(requirements, context) {
    try {
      // 1. Initial Analysis with DistilBERT
      const initialAnalysis = await this.performInitialAnalysis(requirements);

      // 2. Pattern Detection with CodeBERT
      const patterns = await this.detectArchitecturePatterns(requirements, initialAnalysis);

      // 3. Complex Design with Gemini
      const architectureDesign = await this.generateArchitectureDesign(requirements, patterns, context);

      // 4. Documentation with FLAN-T5
      const documentation = await this.generateDocumentation(architectureDesign);

      return {
        analysis: initialAnalysis,
        patterns,
        design: architectureDesign,
        documentation
      };
    } catch (error) {
      logger.error('Error in architecture analysis:', error);
      throw error;
    }
  }

  async performInitialAnalysis(requirements) {
    // Use DistilBERT for quick classification and analysis
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.distilbert,
      message: {
        role: "system",
        content: "Analyze the following requirements and classify the architecture components needed:",
        requirements
      }
    });
    return response.analysis;
  }

  async detectArchitecturePatterns(requirements, initialAnalysis) {
    // Use CodeBERT for pattern detection
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.codebert,
      message: {
        role: "system",
        content: "Identify architecture patterns and best practices for:",
        requirements,
        initialAnalysis
      }
    });
    return response.patterns;
  }

  async generateArchitectureDesign(requirements, patterns, context) {
    // Use Gemini for complex architecture design
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: [
          "Design a comprehensive architecture with the following context:",
          `Requirements: ${requirements}`,
          `Patterns: ${JSON.stringify(patterns)}`,
          `Project Context: ${JSON.stringify(context)}`
        ].join('\n')
      }
    });

    let design = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        design += chunk.content;
      }
    }
    return design;
  }

  async generateDocumentation(architectureDesign) {
    // Use FLAN-T5 for documentation generation
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.flanT5,
      message: {
        role: "system",
        content: "Generate clear documentation for the following architecture:",
        architecture: architectureDesign
      }
    });
    return response.documentation;
  }

  // Helper method to generate Mermaid diagrams
  async generateArchitectureDiagram(design) {
    // Use Gemini for complex diagram generation
    const response = await this.a2aClient.sendMessage({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: "Generate a Mermaid diagram for the following architecture design:",
        design
      }
    });
    return response.diagram;
  }

  // Method to analyze scalability
  async analyzeScalability(design) {
    // Use Gemini for complex scalability analysis
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: "Analyze scalability considerations for the architecture:",
        design
      }
    });

    let analysis = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        analysis += chunk.content;
      }
    }
    return analysis;
  }

  // Method to suggest optimizations
  async suggestOptimizations(design, scalabilityAnalysis) {
    // Use Gemini for complex optimization suggestions
    const response = await this.a2aClient.sendMessageStream({
      endpoint: this.modelEndpoints.gemini,
      message: {
        role: "system",
        content: [
          "Suggest optimizations based on:",
          `Design: ${design}`,
          `Scalability Analysis: ${scalabilityAnalysis}`
        ].join('\n')
      }
    });

    let suggestions = '';
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        suggestions += chunk.content;
      }
    }
    return suggestions;
  }
}

export default ArchitectureDesignerAgent;