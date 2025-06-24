const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { A2AClient } = require('@a2a-js/sdk'); // Will be uncommented when A2A SDK is available
const logger = require('../utils/logger');

class A2AService {
  constructor() {
    // Initialize Google Gemini AI
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || 'demo-key');
    
    // Initialize A2A client (commented out until SDK is available)
    // this.a2aClient = new A2AClient({
    //   apiKey: process.env.A2A_API_KEY,
    //   projectId: process.env.A2A_PROJECT_ID
    // });
    
    this.agents = this.initializeAgents();
    this.skillRegistry = this.buildSkillRegistry();
  }

  initializeAgents() {
    return {
      'arch-001': {
        id: 'arch-001',
        name: 'Architecture Designer',
        skills: ['system-design', 'scalability', 'patterns', 'microservices'],
        model: 'gemini-2.5-flash',
        priority: 'high',
        specialty: 'high-level system architecture',
        systemPrompt: `You are an expert system architect specializing in microservices design, 
        scalability patterns, and distributed systems. Help users design robust, scalable architectures.
        
        Key areas of expertise:
        - Microservices architecture patterns
        - Scalability and performance optimization
        - System design best practices
        - Cloud-native design principles
        - Architecture documentation and visualization
        
        Always provide specific, actionable advice with clear reasoning.`
      },
      
      'db-001': {
        id: 'db-001',
        name: 'Database Designer',
        skills: ['schema-design', 'relationships', 'optimization', 'migrations'],
        model: 'gemini-2.5-flash',
        priority: 'medium',
        specialty: 'data modeling and database design',
        systemPrompt: `You are a database design expert specializing in schema design, 
        relationships, optimization, and data architecture for scalable applications.
        
        Key areas of expertise:
        - Database schema design and normalization
        - Relationship modeling (one-to-one, one-to-many, many-to-many)
        - Query optimization and indexing strategies
        - Database selection (SQL vs NoSQL)
        - Data migration and versioning strategies
        
        Focus on practical, performance-oriented database solutions.`
      },
      
      'api-001': {
        id: 'api-001',
        name: 'API Designer',
        skills: ['rest-design', 'graphql', 'grpc', 'documentation'],
        model: 'gemini-2.5-flash',
        priority: 'high',
        specialty: 'API design and integration',
        systemPrompt: `You are an API design specialist focusing on RESTful services, 
        GraphQL, gRPC, and comprehensive API documentation.
        
        Key areas of expertise:
        - RESTful API design principles and best practices
        - GraphQL schema design and optimization
        - gRPC service definitions and performance
        - API versioning strategies
        - Authentication and authorization patterns
        - API documentation and developer experience
        
        Emphasize consistency, usability, and performance in API design.`
      },
      
      'sec-001': {
        id: 'sec-001',
        name: 'Security Architect',
        skills: ['auth-patterns', 'security-review', 'compliance', 'encryption'],
        model: 'gemini-2.5-flash',
        priority: 'critical',
        specialty: 'security architecture and best practices',
        systemPrompt: `You are a security architecture expert specializing in authentication, 
        authorization, compliance, and security best practices for distributed systems.
        
        Key areas of expertise:
        - Authentication patterns (OAuth 2.0, JWT, SAML)
        - Authorization models (RBAC, ABAC, ACL)
        - Security architecture design
        - Compliance frameworks (GDPR, HIPAA, SOX)
        - Encryption and data protection
        - Security testing and vulnerability assessment
        
        Always prioritize security-first design while maintaining usability.`
      },

      'code-001': {
        id: 'code-001',
        name: 'Code Generator',
        skills: ['code-generation', 'scaffolding', 'boilerplate', 'deployment'],
        model: 'gemini-2.5-flash',
        priority: 'critical',
        specialty: 'production-ready code generation',
        systemPrompt: `You are an expert full-stack code generator specializing in creating production-ready, 
        scalable, and maintainable code for microservices architectures.
        
        Key areas of expertise:
        - Node.js/Express.js microservice generation
        - React/Next.js frontend components
        - Database schemas and migrations
        - Docker containerization
        - API endpoint implementation
        - Authentication and authorization integration
        - Testing frameworks and test generation
        - CI/CD pipeline configurations
        - Environment configuration and secrets management
        
        ALWAYS generate:
        1. Complete, runnable code files
        2. Proper error handling and validation
        3. Security best practices implemented
        4. Environment-based configuration
        5. Comprehensive documentation
        6. Docker files and deployment configs
        7. Test files with meaningful test cases
        8. README with setup instructions
        
        Focus on enterprise-grade code that can be deployed immediately.`
      }
    };
  }

  buildSkillRegistry() {
    const skillMap = {};
    
    Object.values(this.agents).forEach(agent => {
      agent.skills.forEach(skill => {
        if (!skillMap[skill]) {
          skillMap[skill] = [];
        }
        skillMap[skill].push({
          agentId: agent.id,
          name: agent.name,
          priority: agent.priority,
          specialty: agent.specialty
        });
      });
    });
    
    // Sort agents by priority for each skill
    Object.keys(skillMap).forEach(skill => {
      skillMap[skill].sort((a, b) => {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });
    
    return skillMap;
  }

  async routeTask(task) {
    try {
      logger.info(`Routing task: ${task.type} with content: ${task.content?.substring(0, 100)}...`);
      
      // Analyze task to determine required skills
      const requiredSkills = await this.analyzeTaskSkills(task);
      
      // Find best agent for the task
      const selectedAgent = this.selectAgent(requiredSkills, task);
      
      if (!selectedAgent) {
        throw new Error('No suitable agent found for task');
      }
      
      logger.info(`Selected agent: ${selectedAgent.name} for task`);
      
      // Execute task with selected agent
      const response = await this.executeWithAgent(selectedAgent, task);
      
      return {
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        response,
        skills: requiredSkills,
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('Error routing task:', error);
      throw error;
    }
  }

  async analyzeTaskSkills(task) {
    const content = task.content?.toLowerCase() || '';
    const canvasState = task.canvasState || {};
    const skills = [];
    
    // Keyword-based skill detection
    if (content.includes('database') || content.includes('data') || content.includes('schema')) {
      skills.push('schema-design', 'relationships');
    }
    
    if (content.includes('api') || content.includes('endpoint') || content.includes('rest')) {
      skills.push('rest-design', 'documentation');
    }
    
    if (content.includes('security') || content.includes('auth') || content.includes('permission')) {
      skills.push('auth-patterns', 'security-review');
    }
    
    if (content.includes('scale') || content.includes('performance') || content.includes('architecture')) {
      skills.push('system-design', 'scalability');
    }

    if (content.includes('code') || content.includes('generate') || content.includes('implement') || content.includes('deploy')) {
      skills.push('code-generation', 'scaffolding', 'deployment');
    }

    if (content.includes('docker') || content.includes('container') || content.includes('k8s') || content.includes('kubernetes')) {
      skills.push('deployment', 'code-generation');
    }
    
    // Canvas state analysis
    const nodes = canvasState.nodes || [];
    if (nodes.length > 5) {
      skills.push('system-design', 'patterns');
    }

    // Check if this is a code generation request based on task type
    if (task.type === 'generate-code' || task.type === 'code-generation') {
      skills.push('code-generation', 'scaffolding', 'boilerplate');
    }
    
    // Default to architecture if no specific skills detected
    if (skills.length === 0) {
      skills.push('system-design');
    }
    
    return [...new Set(skills)]; // Remove duplicates
  }

  selectAgent(requiredSkills, task) {
    const candidateAgents = [];
    
    requiredSkills.forEach(skill => {
      const agentsForSkill = this.skillRegistry[skill] || [];
      candidateAgents.push(...agentsForSkill);
    });
    
    if (candidateAgents.length === 0) {
      // Fallback to architecture agent
      return this.agents['arch-001'];
    }
    
    // Score agents based on skill match and priority
    const agentScores = {};
    candidateAgents.forEach(candidate => {
      const agent = this.agents[candidate.agentId];
      if (!agent) return;
      
      if (!agentScores[agent.id]) {
        agentScores[agent.id] = {
          agent,
          score: 0,
          skillMatches: 0
        };
      }
      
      agentScores[agent.id].skillMatches++;
      
      // Higher score for more skill matches
      agentScores[agent.id].score += 10;
      
      // Bonus for priority
      const priorityBonus = { 'critical': 20, 'high': 15, 'medium': 10, 'low': 5 };
      agentScores[agent.id].score += priorityBonus[agent.priority] || 0;
    });
    
    // Select agent with highest score
    const bestAgent = Object.values(agentScores).reduce((best, current) => {
      return current.score > best.score ? current : best;
    });
    
    return bestAgent.agent;
  }

  async executeWithAgent(agent, task) {
    try {
      const model = this.genAI.getGenerativeModel({ model: agent.model });
      
      // Build comprehensive prompt with context and action capabilities
      const prompt = this.buildEnhancedPrompt(agent, task);
      
      logger.info(`Executing task with agent ${agent.name}`);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse and structure the response
      const structuredResponse = this.parseEnhancedResponse(text, task, agent);
      
      // Process any actions suggested by the agent
      if (structuredResponse.data && structuredResponse.data.actions) {
        structuredResponse.processedActions = await this.processAgentActions(structuredResponse.data.actions, task);
      }
      
      return structuredResponse;
    } catch (error) {
      logger.error(`Error executing task with agent ${agent.name}:`, error);
      throw error;
    }
  }

  buildEnhancedPrompt(agent, task) {
    const context = this.buildSimpleContextFromCanvas(task.canvasState);
    const componentInfo = this.extractComponentInfo(task.component);
    
    return `${agent.systemPrompt}

TASK: ${task.type}
USER REQUEST: ${task.content}

CURRENT COMPONENT: ${componentInfo.name} (${componentInfo.type})
${componentInfo.description ? `Description: ${componentInfo.description}` : ''}

ARCHITECTURE CONTEXT:
${context}

Please provide your analysis and recommendations in a clear, structured format. Focus on:
1. Key insights about the current architecture
2. Specific recommendations for improvement
3. Any code or configuration suggestions
4. Next steps to implement changes

Respond in a clear, actionable format that helps the user improve their system design.`;
  }

  // Simplified context builder for faster responses
  buildSimpleContextFromCanvas(canvasState) {
    if (!canvasState || !canvasState.nodes) return "No architecture components available";
    
    const nodes = canvasState.nodes;
    const edges = canvasState.edges || [];
    
    let context = `Architecture Overview:\n`;
    context += `- Components: ${nodes.length}\n`;
    context += `- Connections: ${edges.length}\n`;
    
    // List main components
    if (nodes.length > 0) {
      context += `\nMain Components:\n`;
      nodes.slice(0, 5).forEach(node => { // Limit to first 5 components
        context += `• ${node.data.label} (${node.data.serviceType || 'component'})\n`;
      });
      
      if (nodes.length > 5) {
        context += `... and ${nodes.length - 5} more components\n`;
      }
    }
    
    // Basic connection info
    if (edges.length > 0) {
      context += `\nKey Connections:\n`;
      edges.slice(0, 3).forEach(edge => { // Limit to first 3 connections
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          context += `• ${sourceNode.data.label} → ${targetNode.data.label}\n`;
        }
      });
      
      if (edges.length > 3) {
        context += `... and ${edges.length - 3} more connections\n`;
      }
    }
    
    return context;
  }

  buildContextFromCanvas(canvasState) {
    if (!canvasState || !canvasState.nodes) return "No canvas context available";
    
    const nodes = canvasState.nodes;
    const edges = canvasState.edges || [];
    
    // Build comprehensive context
    let context = `=== CURRENT ARCHITECTURE ANALYSIS ===\n\n`;
    
    // Overview
    context += `Architecture Overview:\n`;
    context += `- Total Components: ${nodes.length}\n`;
    context += `- Total Connections: ${edges.length}\n`;
    context += `- Architecture Pattern: ${this.detectArchitecturePattern(nodes)}\n`;
    context += `- Complexity Score: ${this.calculateComplexityScore(nodes, edges)}\n\n`;
    
    // Component Details
    context += `=== COMPONENT INVENTORY ===\n`;
    const componentsByType = this.groupComponentsByType(nodes);
    
    Object.entries(componentsByType).forEach(([type, components]) => {
      context += `\n${type.toUpperCase()} Components (${components.length}):\n`;
      components.forEach(component => {
        context += `  • ${component.data.label}\n`;
        if (component.data.description) {
          context += `    Description: ${component.data.description}\n`;
        }
        if (component.data.properties) {
          const props = Object.entries(component.data.properties)
            .filter(([key, value]) => value !== undefined && value !== '')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          if (props) {
            context += `    Properties: ${props}\n`;
          }
        }
        context += `    Position: (${Math.round(component.position.x)}, ${Math.round(component.position.y)})\n`;
      });
    });
    
    // Connection Analysis
    if (edges.length > 0) {
      context += `\n=== CONNECTION ANALYSIS ===\n`;
      const connectionPatterns = this.analyzeConnectionPatterns(nodes, edges);
      
      context += `Connection Patterns:\n`;
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          context += `  • ${sourceNode.data.label} → ${targetNode.data.label}\n`;
          context += `    Type: ${sourceNode.data.serviceType} to ${targetNode.data.serviceType}\n`;
        }
      });
      
      context += `\nArchitecture Insights:\n`;
      context += `  • Entry Points: ${connectionPatterns.entryPoints.map(n => n.data.label).join(', ')}\n`;
      context += `  • Critical Components: ${connectionPatterns.hubs.map(n => n.data.label).join(', ')}\n`;
      context += `  • Isolated Components: ${connectionPatterns.isolated.map(n => n.data.label).join(', ')}\n`;
    }
    
    // Scalability Analysis
    context += `\n=== SCALABILITY ANALYSIS ===\n`;
    const scalabilityInsights = this.analyzeScalability(nodes, edges);
    context += `Potential Bottlenecks: ${scalabilityInsights.bottlenecks.join(', ') || 'None identified'}\n`;
    context += `Scalability Score: ${scalabilityInsights.score}/10\n`;
    context += `Recommendations: ${scalabilityInsights.recommendations.join('; ')}\n`;
    
    // Security Analysis
    context += `\n=== SECURITY ANALYSIS ===\n`;
    const securityAnalysis = this.analyzeSecurityPosture(nodes, edges);
    context += `Security Components: ${securityAnalysis.securityComponents.join(', ') || 'None found'}\n`;
    context += `Security Score: ${securityAnalysis.score}/10\n`;
    context += `Security Gaps: ${securityAnalysis.gaps.join('; ') || 'None identified'}\n`;
    
    // Available Actions
    context += `\n=== AVAILABLE ACTIONS ===\n`;
    context += `I can perform the following actions on this architecture:\n`;
    context += `  • ADD_COMPONENT: Add new components to the canvas\n`;
    context += `  • UPDATE_COMPONENT: Modify existing component properties\n`;
    context += `  • CONNECT_COMPONENTS: Create connections between components\n`;
    context += `  • REMOVE_COMPONENT: Remove components from the canvas\n`;
    context += `  • OPTIMIZE_LAYOUT: Rearrange components for better visualization\n`;
    context += `  • GENERATE_CODE: Create production-ready code for components\n`;
    context += `  • SUGGEST_IMPROVEMENTS: Recommend architecture enhancements\n`;
    context += `  • VALIDATE_ARCHITECTURE: Check for best practices and issues\n\n`;
    
    context += `When suggesting changes, I will provide specific action commands that can be executed.\n`;
    
    return context;
  }

  // New helper methods for enhanced context analysis
  detectArchitecturePattern(nodes) {
    const serviceTypes = nodes.map(n => n.data.serviceType).filter(Boolean);
    const hasMultipleServices = serviceTypes.filter(t => t === 'microservice').length > 1;
    const hasApiGateway = serviceTypes.includes('api');
    const hasDatabase = serviceTypes.includes('database');
    const hasLoadBalancer = serviceTypes.includes('loadbalancer');
    
    if (hasMultipleServices && hasApiGateway) return 'Microservices';
    if (hasLoadBalancer && hasMultipleServices) return 'Distributed System';
    if (serviceTypes.length === 1) return 'Monolithic';
    return 'Hybrid Architecture';
  }

  groupComponentsByType(nodes) {
    const groups = {};
    nodes.forEach(node => {
      const type = node.data.serviceType || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(node);
    });
    return groups;
  }

  analyzeConnectionPatterns(nodes, edges) {
    const incomingConnections = {};
    const outgoingConnections = {};
    
    // Count connections for each node
    nodes.forEach(node => {
      incomingConnections[node.id] = 0;
      outgoingConnections[node.id] = 0;
    });
    
    edges.forEach(edge => {
      outgoingConnections[edge.source]++;
      incomingConnections[edge.target]++;
    });
    
    // Find entry points (no incoming connections)
    const entryPoints = nodes.filter(node => incomingConnections[node.id] === 0);
    
    // Find hubs (high number of connections)
    const hubs = nodes.filter(node => 
      (incomingConnections[node.id] + outgoingConnections[node.id]) > 2
    );
    
    // Find isolated components
    const isolated = nodes.filter(node => 
      incomingConnections[node.id] === 0 && outgoingConnections[node.id] === 0
    );
    
    return { entryPoints, hubs, isolated };
  }

  analyzeScalability(nodes, edges) {
    const bottlenecks = [];
    const recommendations = [];
    let score = 8; // Start with good score
    
    // Check for single points of failure
    const connectionPatterns = this.analyzeConnectionPatterns(nodes, edges);
    if (connectionPatterns.hubs.length > 0) {
      connectionPatterns.hubs.forEach(hub => {
        if (!hub.data.serviceType?.includes('loadbalancer')) {
          bottlenecks.push(hub.data.label);
          score -= 1;
        }
      });
    }
    
    // Check for load balancing
    const hasLoadBalancer = nodes.some(n => n.data.serviceType === 'loadbalancer');
    if (!hasLoadBalancer && nodes.length > 3) {
      recommendations.push('Consider adding a load balancer');
      score -= 1;
    }
    
    // Check for caching
    const hasCache = nodes.some(n => n.data.serviceType === 'cache');
    if (!hasCache && nodes.length > 2) {
      recommendations.push('Consider adding caching layer');
      score -= 0.5;
    }
    
    return { bottlenecks, recommendations, score: Math.max(0, score) };
  }

  analyzeSecurityPosture(nodes, edges) {
    const securityComponents = [];
    const gaps = [];
    let score = 5; // Start with neutral score
    
    // Check for security components
    nodes.forEach(node => {
      if (node.data.serviceType === 'security' || 
          node.data.label.toLowerCase().includes('auth') ||
          node.data.label.toLowerCase().includes('security')) {
        securityComponents.push(node.data.label);
        score += 2;
      }
    });
    
    // Check for API Gateway (security boundary)
    const hasApiGateway = nodes.some(n => n.data.serviceType === 'api');
    if (hasApiGateway) {
      score += 1;
    } else if (nodes.length > 1) {
      gaps.push('Missing API Gateway for security boundary');
      score -= 1;
    }
    
    // Check for external services without security
    const externalServices = nodes.filter(n => n.data.serviceType === 'external');
    if (externalServices.length > 0 && securityComponents.length === 0) {
      gaps.push('External services without explicit security layer');
      score -= 2;
    }
    
    return { 
      securityComponents, 
      gaps, 
      score: Math.max(0, Math.min(10, score)) 
    };
  }

  calculateComplexityScore(nodes, edges) {
    // Simple complexity calculation based on components and connections
    const nodeComplexity = nodes.length * 1.5;
    const edgeComplexity = edges.length * 1.0;
    const typeVariety = new Set(nodes.map(n => n.data.serviceType)).size * 0.5;
    
    return Math.round(nodeComplexity + edgeComplexity + typeVariety);
  }

  extractComponentInfo(component) {
    if (!component) return { name: "Unknown", type: "unknown", description: "", properties: {} };
    
    return {
      name: component.data?.label || "Unknown Component",
      type: component.data?.serviceType || "unknown",
      description: component.data?.description || "",
      functionalRequirements: component.data?.functionalRequirements || "",
      requestFormat: component.data?.requestFormat || "",
      responseFormat: component.data?.responseFormat || "",
      properties: component.data?.properties || {}
    };
  }

  parseEnhancedResponse(text, task, agent) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'structured',
          agent: agent.name,
          data: parsed,
          raw: text
        };
      }
    } catch (error) {
      logger.warn('Failed to parse structured response, falling back to text parsing');
    }
    
    // Fallback to text parsing
    return {
      type: 'text',
      agent: agent.name,
      data: {
        analysis: this.extractSection(text, 'analysis') || text.substring(0, 500),
        suggestions: this.extractSuggestions(text),
        codeGeneration: this.extractCodeGeneration(text),
        optimizations: this.extractOptimizations(text)
      },
      raw: text
    };
  }

  extractSuggestions(text) {
    try {
      // Try to find suggestions in various formats
      const suggestions = [];
      
      // Look for numbered suggestions
      const numberedMatches = text.match(/\d+\.\s*([^\n]+)/g);
      if (numberedMatches) {
        numberedMatches.forEach(match => {
          const suggestion = match.replace(/^\d+\.\s*/, '').trim();
          if (suggestion.length > 10) { // Filter out short/irrelevant matches
            suggestions.push({
              title: suggestion.substring(0, 50) + (suggestion.length > 50 ? '...' : ''),
              description: suggestion,
              priority: 'medium',
              implementation: 'See detailed analysis above'
            });
          }
        });
      }
      
      // Look for bullet point suggestions
      const bulletMatches = text.match(/[-•*]\s*([^\n]+)/g);
      if (bulletMatches && suggestions.length < 3) {
        bulletMatches.slice(0, 3).forEach(match => {
          const suggestion = match.replace(/^[-•*]\s*/, '').trim();
          if (suggestion.length > 10) {
            suggestions.push({
              title: suggestion.substring(0, 50) + (suggestion.length > 50 ? '...' : ''),
              description: suggestion,
              priority: 'medium',
              implementation: 'Follow the recommendation provided'
            });
          }
        });
      }
      
      // If no structured suggestions found, create a generic one
      if (suggestions.length === 0) {
        suggestions.push({
          title: 'AI Analysis Completed',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          priority: 'medium',
          implementation: 'Review the full analysis for details'
        });
      }
      
      return suggestions.slice(0, 5); // Limit to 5 suggestions max
    } catch (error) {
      logger.error('Error extracting suggestions:', error);
      return [{
        title: 'Analysis Available',
        description: 'AI analysis completed successfully',
        priority: 'low',
        implementation: 'Review the response for details'
      }];
    }
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractCodeGeneration(text) {
    const codeBlocks = text.match(/```(\w+)?\n([\s\S]*?)```/g);
    if (!codeBlocks) return null;
    
    return {
      language: 'javascript', // Default
      code: codeBlocks[0].replace(/```\w*\n?/g, '').replace(/```$/g, ''),
      dependencies: this.extractDependencies(text),
      deploymentConfig: this.extractDeploymentConfig(text)
    };
  }

  extractDependencies(text) {
    const depMatch = text.match(/dependencies?[:\s]*\[(.*?)\]/i);
    if (depMatch) {
      return depMatch[1].split(',').map(dep => dep.trim().replace(/['"]/g, ''));
    }
    return [];
  }

  extractDeploymentConfig(text) {
    const dockerMatch = text.match(/dockerfile?[:\s]*```[\s\S]*?```/i);
    if (dockerMatch) return dockerMatch[0];
    
    const k8sMatch = text.match(/kubernetes?[:\s]*```[\s\S]*?```/i);
    if (k8sMatch) return k8sMatch[0];
    
    return null;
  }

  extractOptimizations(text) {
    return {
      performance: this.extractListItems(text, 'performance'),
      security: this.extractListItems(text, 'security'),
      scalability: this.extractListItems(text, 'scalability')
    };
  }

  extractListItems(text, category) {
    const regex = new RegExp(`${category}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    
    return match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // Future: Multi-agent collaboration
  async collaborateAgents(task, agentIds) {
    try {
      logger.info(`Starting multi-agent collaboration for task`);
      
      const responses = await Promise.all(
        agentIds.map(agentId => {
          const agent = this.agents[agentId];
          return agent ? this.executeWithAgent(agent, task) : null;
        })
      );
      
      const validResponses = responses.filter(Boolean);
      
      // Aggregate responses
      const collaborativeResponse = this.aggregateResponses(validResponses, task);
      
      return collaborativeResponse;
    } catch (error) {
      logger.error('Error in agent collaboration:', error);
      throw error;
    }
  }

  aggregateResponses(responses, task) {
    // Simple aggregation - in future, use A2A protocol for intelligent merging
    const content = responses.map(r => r.content).join('\n\n---\n\n');
    const allSuggestions = responses.flatMap(r => r.suggestions || []);
    const uniqueSuggestions = [...new Set(allSuggestions)];
    
    return {
      content: `**Collaborative Analysis:**\n\n${content}`,
      suggestions: uniqueSuggestions.slice(0, 6),
      collaborators: responses.length
    };
  }

  async getAgentStatus() {
    return {
      totalAgents: Object.keys(this.agents).length,
      activeAgents: Object.values(this.agents).filter(a => a.status !== 'inactive').length,
      skillCoverage: Object.keys(this.skillRegistry).length,
      agents: Object.values(this.agents).map(agent => ({
        id: agent.id,
        name: agent.name,
        skills: agent.skills,
        priority: agent.priority,
        status: 'active'
      }))
    };
  }

  // New method to process agent actions
  async processAgentActions(actions, task) {
    const processedActions = [];
    
    if (!Array.isArray(actions)) return processedActions;
    
    for (const action of actions) {
      try {
        const processedAction = await this.executeAction(action, task);
        processedActions.push(processedAction);
      } catch (error) {
        logger.error(`Error processing action ${action.type}:`, error);
        processedActions.push({
          ...action,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return processedActions;
  }

  // Execute individual actions
  async executeAction(action, task) {
    logger.info(`Executing action: ${action.type}`);
    
    switch (action.type) {
      case 'ADD_COMPONENT':
        return this.executeAddComponent(action, task);
      
      case 'UPDATE_COMPONENT':
        return this.executeUpdateComponent(action, task);
      
      case 'CONNECT_COMPONENTS':
        return this.executeConnectComponents(action, task);
      
      case 'REMOVE_COMPONENT':
        return this.executeRemoveComponent(action, task);
      
      case 'OPTIMIZE_LAYOUT':
        return this.executeOptimizeLayout(action, task);
      
      case 'GENERATE_CODE':
        return this.executeGenerateCode(action, task);
      
      case 'SUGGEST_IMPROVEMENTS':
        return this.executeSuggestImprovements(action, task);
      
      case 'VALIDATE_ARCHITECTURE':
        return this.executeValidateArchitecture(action, task);
      
      default:
        return {
          ...action,
          status: 'unsupported',
          message: `Action type ${action.type} is not supported`
        };
    }
  }

  // Action implementations
  executeAddComponent(action, task) {
    const newComponent = {
      id: `ai-generated-${Date.now()}`,
      type: 'default',
      position: action.position || { x: Math.random() * 500 + 200, y: Math.random() * 300 + 100 },
      data: {
        label: action.label || 'New Component',
        serviceType: action.serviceType || 'microservice',
        description: action.description || 'AI-generated component',
        properties: action.properties || {}
      }
    };

    return {
      ...action,
      status: 'ready',
      component: newComponent,
      message: `Ready to add ${newComponent.data.label} component`
    };
  }

  executeUpdateComponent(action, task) {
    return {
      ...action,
      status: 'ready',
      updates: action.updates || {},
      message: `Ready to update component ${action.componentId || action.label}`
    };
  }

  executeConnectComponents(action, task) {
    const connection = {
      id: `ai-connection-${Date.now()}`,
      source: action.sourceId,
      target: action.targetId,
      type: action.connectionType || 'default',
      data: action.connectionData || {}
    };

    return {
      ...action,
      status: 'ready',
      connection: connection,
      message: `Ready to connect ${action.sourceLabel || action.sourceId} to ${action.targetLabel || action.targetId}`
    };
  }

  executeRemoveComponent(action, task) {
    return {
      ...action,
      status: 'ready',
      message: `Ready to remove component ${action.componentId || action.label}`
    };
  }

  executeOptimizeLayout(action, task) {
    // Calculate optimal positions based on component types and connections
    const canvasState = task.context?.canvasState || task.canvasState;
    if (!canvasState || !canvasState.nodes) {
      return {
        ...action,
        status: 'failed',
        message: 'No canvas state available for layout optimization'
      };
    }

    const optimizedPositions = this.calculateOptimalLayout(canvasState.nodes, canvasState.edges);

    return {
      ...action,
      status: 'ready',
      optimizedPositions: optimizedPositions,
      message: 'Ready to optimize component layout'
    };
  }

  executeGenerateCode(action, task) {
    return {
      ...action,
      status: 'ready',
      codeGeneration: {
        language: action.language || 'javascript',
        framework: action.framework || 'express',
        includeTests: action.includeTests !== false,
        includeDocker: action.includeDocker !== false
      },
      message: `Ready to generate ${action.language || 'JavaScript'} code for ${action.componentLabel || 'component'}`
    };
  }

  executeSuggestImprovements(action, task) {
    const canvasState = task.context?.canvasState || task.canvasState;
    if (!canvasState) {
      return {
        ...action,
        status: 'failed',
        message: 'No canvas state available for improvement suggestions'
      };
    }

    const improvements = this.generateImprovementSuggestions(canvasState);

    return {
      ...action,
      status: 'completed',
      improvements: improvements,
      message: `Generated ${improvements.length} improvement suggestions`
    };
  }

  executeValidateArchitecture(action, task) {
    const canvasState = task.context?.canvasState || task.canvasState;
    if (!canvasState) {
      return {
        ...action,
        status: 'failed',
        message: 'No canvas state available for validation'
      };
    }

    const validation = this.validateArchitecture(canvasState);

    return {
      ...action,
      status: 'completed',
      validation: validation,
      message: `Architecture validation completed with ${validation.issues.length} issues found`
    };
  }

  // Helper methods for actions
  calculateOptimalLayout(nodes, edges) {
    // Simple force-directed layout algorithm
    const positions = {};
    const nodeTypes = this.groupComponentsByType(nodes);
    
    let yOffset = 100;
    Object.entries(nodeTypes).forEach(([type, components]) => {
      let xOffset = 100;
      components.forEach(component => {
        positions[component.id] = {
          x: xOffset,
          y: yOffset
        };
        xOffset += 200;
      });
      yOffset += 150;
    });

    return positions;
  }

  generateImprovementSuggestions(canvasState) {
    const improvements = [];
    const nodes = canvasState.nodes || [];
    const edges = canvasState.edges || [];

    // Check for missing load balancer
    const hasLoadBalancer = nodes.some(n => n.data.serviceType === 'loadbalancer');
    if (!hasLoadBalancer && nodes.length > 3) {
      improvements.push({
        type: 'ADD_COMPONENT',
        priority: 'high',
        title: 'Add Load Balancer',
        description: 'Consider adding a load balancer to distribute traffic across multiple services',
        action: {
          type: 'ADD_COMPONENT',
          serviceType: 'loadbalancer',
          label: 'Load Balancer',
          position: { x: 300, y: 50 }
        }
      });
    }

    // Check for missing caching
    const hasCache = nodes.some(n => n.data.serviceType === 'cache');
    if (!hasCache && nodes.length > 2) {
      improvements.push({
        type: 'ADD_COMPONENT',
        priority: 'medium',
        title: 'Add Caching Layer',
        description: 'Adding a cache can significantly improve performance',
        action: {
          type: 'ADD_COMPONENT',
          serviceType: 'cache',
          label: 'Redis Cache',
          position: { x: 400, y: 200 }
        }
      });
    }

    // Check for security gaps
    const hasAuth = nodes.some(n => 
      n.data.serviceType === 'security' || 
      n.data.label.toLowerCase().includes('auth')
    );
    if (!hasAuth && nodes.length > 1) {
      improvements.push({
        type: 'ADD_COMPONENT',
        priority: 'critical',
        title: 'Add Authentication Service',
        description: 'Your architecture needs an authentication and authorization layer',
        action: {
          type: 'ADD_COMPONENT',
          serviceType: 'security',
          label: 'Auth Service',
          position: { x: 200, y: 100 }
        }
      });
    }

    return improvements;
  }

  validateArchitecture(canvasState) {
    const issues = [];
    const warnings = [];
    const nodes = canvasState.nodes || [];
    const edges = canvasState.edges || [];

    // Check for isolated components
    const connectionPatterns = this.analyzeConnectionPatterns(nodes, edges);
    if (connectionPatterns.isolated.length > 0) {
      connectionPatterns.isolated.forEach(node => {
        issues.push({
          type: 'isolation',
          severity: 'warning',
          component: node.data.label,
          message: `Component "${node.data.label}" is not connected to any other components`
        });
      });
    }

    // Check for potential bottlenecks
    const scalabilityAnalysis = this.analyzeScalability(nodes, edges);
    if (scalabilityAnalysis.bottlenecks.length > 0) {
      scalabilityAnalysis.bottlenecks.forEach(bottleneck => {
        issues.push({
          type: 'bottleneck',
          severity: 'high',
          component: bottleneck,
          message: `Component "${bottleneck}" might be a bottleneck due to high connectivity`
        });
      });
    }

    // Check security posture
    const securityAnalysis = this.analyzeSecurityPosture(nodes, edges);
    if (securityAnalysis.score < 5) {
      issues.push({
        type: 'security',
        severity: 'critical',
        message: `Low security score (${securityAnalysis.score}/10). Consider adding authentication and security layers`
      });
    }

    return {
      score: this.calculateArchitectureScore(nodes, edges),
      issues: issues,
      warnings: warnings,
      recommendations: scalabilityAnalysis.recommendations
    };
  }

  calculateArchitectureScore(nodes, edges) {
    let score = 50; // Base score
    
    // Add points for good practices
    const hasLoadBalancer = nodes.some(n => n.data.serviceType === 'loadbalancer');
    const hasCache = nodes.some(n => n.data.serviceType === 'cache');
    const hasAuth = nodes.some(n => n.data.serviceType === 'security');
    const hasApiGateway = nodes.some(n => n.data.serviceType === 'api');
    const hasDatabase = nodes.some(n => n.data.serviceType === 'database');
    
    if (hasLoadBalancer) score += 10;
    if (hasCache) score += 8;
    if (hasAuth) score += 15;
    if (hasApiGateway) score += 12;
    if (hasDatabase) score += 5;
    
    // Deduct points for issues
    const connectionPatterns = this.analyzeConnectionPatterns(nodes, edges);
    score -= connectionPatterns.isolated.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = new A2AService(); 