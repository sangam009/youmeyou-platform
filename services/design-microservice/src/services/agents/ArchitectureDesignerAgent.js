import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';
import { LLMAgent } from '../LLMAgent.js';

/**
 * Architecture Designer Agent
 * Specializes in system architecture design and scalability analysis
 */
export class ArchitectureDesignerAgent {
  constructor() {
    this.name = 'Architecture Designer';
    this.capabilities = [
      'system-architecture',
      'scalability-analysis',
      'component-design',
      'performance-optimization'
    ];
    
    logger.info('🏗️ ArchitectureDesignerAgent initialized');
    this.llmAgent = LLMAgent.getInstance();
  }

  /**
   * Execute architecture design task
   */
  async execute(prompt, context = {}) {
    return this.handleTask(prompt, context);
  }

  /**
   * Handle architecture design task with streaming support
   */
  async handleTask(prompt, context = {}) {
    const { streamingEnabled, streamingCallback } = context;

    try {
      if (streamingEnabled && streamingCallback) {
        // Send initial status
        streamingCallback({
          type: 'agent_start',
          agent: 'Architecture Designer',
          status: 'Starting architecture analysis...',
          completionScore: 0
        });
      }

      // Execute architecture design task
      const result = await this.llmAgent.execute(prompt, {
        ...context,
        specialization: 'architecture',
        taskType: 'design'
      });

      if (streamingEnabled && streamingCallback) {
        // Send completion status
        streamingCallback({
          type: 'agent_complete',
          agent: 'Architecture Designer',
          status: 'Architecture analysis complete',
          completionScore: 100,
          result
        });
      }

      return {
        type: 'architecture_design',
        content: result.content,
        metadata: {
          ...result.metadata,
          agent: 'Architecture Designer'
        }
      };

    } catch (error) {
      logger.error('❌ Architecture Designer task failed:', error);
      
      if (streamingEnabled && streamingCallback) {
        streamingCallback({
          type: 'error',
          agent: 'Architecture Designer',
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Parse requirements from user query
   */
  parseRequirements(userQuery) {
    const requirements = {
      type: 'web-application',
      scale: 'medium',
      features: [],
      constraints: [],
      technologies: []
    };

    const query = userQuery.toLowerCase();

    // Determine application type
    if (query.includes('microservice')) requirements.type = 'microservices';
    if (query.includes('mobile')) requirements.type = 'mobile-app';
    if (query.includes('api')) requirements.type = 'api-service';
    if (query.includes('e-commerce')) requirements.type = 'e-commerce';

    // Determine scale
    if (query.includes('large') || query.includes('enterprise')) requirements.scale = 'large';
    if (query.includes('small') || query.includes('simple')) requirements.scale = 'small';

    // Extract features
    const featureKeywords = ['authentication', 'payment', 'chat', 'notification', 'search', 'analytics'];
    featureKeywords.forEach(feature => {
      if (query.includes(feature)) {
        requirements.features.push(feature);
      }
    });

    // Extract technologies
    const techKeywords = ['react', 'node', 'python', 'java', 'mongodb', 'postgresql', 'redis'];
    techKeywords.forEach(tech => {
      if (query.includes(tech)) {
        requirements.technologies.push(tech);
      }
    });

    return requirements;
  }

  /**
   * Design system architecture
   */
  async designArchitecture(requirements, context) {
    const architecture = {
      overview: this.generateOverview(requirements),
      components: this.designComponents(requirements),
      dataFlow: this.designDataFlow(requirements),
      deployment: this.designDeployment(requirements),
      security: this.designSecurity(requirements),
      scalability: this.designScalability(requirements)
    };

    return architecture;
  }

  /**
   * Generate architecture overview
   */
  generateOverview(requirements) {
    return {
      type: requirements.type,
      scale: requirements.scale,
      pattern: this.selectArchitecturePattern(requirements),
      description: `${requirements.type} architecture designed for ${requirements.scale} scale applications`,
      mainComponents: this.getMainComponents(requirements.type)
    };
  }

  /**
   * Select appropriate architecture pattern
   */
  selectArchitecturePattern(requirements) {
    if (requirements.type === 'microservices') return 'microservices';
    if (requirements.scale === 'large') return 'layered-microservices';
    if (requirements.type === 'api-service') return 'api-gateway';
    return 'layered-monolith';
  }

  /**
   * Get main components for architecture type
   */
  getMainComponents(type) {
    const componentMap = {
      'web-application': ['frontend', 'backend', 'database', 'cache'],
      'microservices': ['api-gateway', 'services', 'database', 'message-queue'],
      'mobile-app': ['mobile-client', 'api-server', 'database', 'push-service'],
      'api-service': ['api-gateway', 'business-logic', 'database', 'cache'],
      'e-commerce': ['frontend', 'product-service', 'order-service', 'payment-service', 'database']
    };

    return componentMap[type] || componentMap['web-application'];
  }

  /**
   * Design system components
   */
  designComponents(requirements) {
    const components = [];
    const mainComponents = this.getMainComponents(requirements.type);

    mainComponents.forEach(componentType => {
      components.push({
        id: componentType,
        name: this.formatComponentName(componentType),
        type: componentType,
        description: this.getComponentDescription(componentType),
        technologies: this.suggestTechnologies(componentType, requirements),
        responsibilities: this.getComponentResponsibilities(componentType),
        interfaces: this.getComponentInterfaces(componentType)
      });
    });

    return components;
  }

  /**
   * Format component name
   */
  formatComponentName(componentType) {
    return componentType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Get component description
   */
  getComponentDescription(componentType) {
    const descriptions = {
      'frontend': 'User interface and client-side logic',
      'backend': 'Server-side business logic and API endpoints',
      'database': 'Data storage and persistence layer',
      'cache': 'High-speed data caching for performance',
      'api-gateway': 'Central entry point for all API requests',
      'services': 'Microservices handling specific business domains',
      'message-queue': 'Asynchronous message processing',
      'mobile-client': 'Native or hybrid mobile application',
      'api-server': 'RESTful API server for mobile clients',
      'push-service': 'Push notification delivery service',
      'business-logic': 'Core business rules and processing',
      'product-service': 'Product catalog and inventory management',
      'order-service': 'Order processing and fulfillment',
      'payment-service': 'Payment processing and transactions'
    };

    return descriptions[componentType] || 'Application component';
  }

  /**
   * Suggest technologies for component
   */
  suggestTechnologies(componentType, requirements) {
    const techSuggestions = {
      'frontend': ['React', 'Next.js', 'TypeScript'],
      'backend': ['Node.js', 'Express', 'TypeScript'],
      'database': ['PostgreSQL', 'MongoDB'],
      'cache': ['Redis', 'Memcached'],
      'api-gateway': ['Kong', 'AWS API Gateway', 'Nginx'],
      'message-queue': ['RabbitMQ', 'Apache Kafka', 'AWS SQS'],
      'mobile-client': ['React Native', 'Flutter'],
      'api-server': ['Node.js', 'Express', 'Fastify']
    };

    // Override with user-specified technologies
    const suggested = techSuggestions[componentType] || ['To be determined'];
    
    // Add user-specified technologies if relevant
    requirements.technologies.forEach(tech => {
      if (!suggested.includes(tech)) {
        suggested.push(tech);
      }
    });

    return suggested;
  }

  /**
   * Get component responsibilities
   */
  getComponentResponsibilities(componentType) {
    const responsibilities = {
      'frontend': ['User interface rendering', 'User interaction handling', 'State management'],
      'backend': ['Business logic processing', 'API endpoint handling', 'Data validation'],
      'database': ['Data persistence', 'Query processing', 'Data integrity'],
      'cache': ['Fast data retrieval', 'Session storage', 'Performance optimization'],
      'api-gateway': ['Request routing', 'Authentication', 'Rate limiting'],
      'message-queue': ['Asynchronous processing', 'Event handling', 'Load balancing']
    };

    return responsibilities[componentType] || ['Component-specific functionality'];
  }

  /**
   * Get component interfaces
   */
  getComponentInterfaces(componentType) {
    const interfaces = {
      'frontend': ['HTTP API calls', 'WebSocket connections'],
      'backend': ['REST API', 'Database connections'],
      'database': ['SQL/NoSQL queries', 'Connection pooling'],
      'cache': ['Key-value operations', 'TTL management'],
      'api-gateway': ['HTTP/HTTPS', 'WebSocket proxy'],
      'message-queue': ['Pub/Sub messaging', 'Queue management']
    };

    return interfaces[componentType] || ['Standard interfaces'];
  }

  /**
   * Design data flow
   */
  designDataFlow(requirements) {
    return {
      userRequests: 'Frontend → API Gateway → Backend Services → Database',
      dataRetrieval: 'Database → Backend Services → Cache → Frontend',
      authentication: 'Frontend → Auth Service → Token Validation',
      notifications: 'Event Trigger → Message Queue → Notification Service'
    };
  }

  /**
   * Design deployment architecture
   */
  designDeployment(requirements) {
    const deployment = {
      strategy: requirements.scale === 'large' ? 'containerized-microservices' : 'containerized-monolith',
      platform: 'Docker + Kubernetes',
      environments: ['development', 'staging', 'production'],
      scaling: requirements.scale === 'large' ? 'horizontal' : 'vertical',
      monitoring: ['Application metrics', 'Infrastructure monitoring', 'Log aggregation']
    };

    return deployment;
  }

  /**
   * Design security architecture
   */
  designSecurity(requirements) {
    return {
      authentication: 'JWT-based authentication',
      authorization: 'Role-based access control (RBAC)',
      dataProtection: 'Encryption at rest and in transit',
      apiSecurity: 'Rate limiting, input validation, CORS',
      infrastructure: 'Network security, firewall rules, VPN access'
    };
  }

  /**
   * Design scalability features
   */
  designScalability(requirements) {
    return {
      horizontal: ['Load balancing', 'Auto-scaling groups', 'Database sharding'],
      vertical: ['Resource optimization', 'Performance tuning'],
      caching: ['Application-level caching', 'CDN for static assets'],
      database: ['Read replicas', 'Connection pooling', 'Query optimization']
    };
  }

  /**
   * Analyze scalability
   */
  analyzeScalability(architecture) {
    return {
      currentCapacity: 'Designed for medium-scale applications',
      bottlenecks: ['Database queries', 'API response times'],
      recommendations: [
        'Implement caching layer for frequently accessed data',
        'Consider database indexing for common queries',
        'Add load balancing for high availability'
      ],
      metrics: {
        expectedUsers: '10,000 concurrent users',
        responseTime: '< 200ms average',
        availability: '99.9% uptime'
      }
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(architecture, requirements) {
    return {
      performance: [
        'Implement caching strategy for frequently accessed data',
        'Use CDN for static asset delivery',
        'Optimize database queries with proper indexing'
      ],
      security: [
        'Implement comprehensive input validation',
        'Use HTTPS for all communications',
        'Regular security audits and updates'
      ],
      maintainability: [
        'Follow consistent coding standards',
        'Implement comprehensive testing strategy',
        'Use infrastructure as code for deployments'
      ],
      scalability: [
        'Design for horizontal scaling from the start',
        'Implement proper monitoring and alerting',
        'Plan for database scaling strategies'
      ]
    };
  }

  /**
   * Generate canvas data for visualization
   */
  generateCanvasData(architecture) {
    const nodes = [];
    const edges = [];
    let nodeId = 1;

    // Create nodes for each component
    architecture.components.forEach((component, index) => {
      nodes.push({
        id: component.id,
        type: 'custom',
        position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 200 },
        data: {
          label: component.name,
          type: component.type,
          description: component.description,
          technologies: component.technologies
        }
      });
    });

    // Create edges based on typical component relationships
    const relationships = [
      { from: 'frontend', to: 'backend' },
      { from: 'backend', to: 'database' },
      { from: 'backend', to: 'cache' },
      { from: 'api-gateway', to: 'services' },
      { from: 'services', to: 'database' }
    ];

    relationships.forEach(rel => {
      const sourceNode = nodes.find(n => n.id === rel.from);
      const targetNode = nodes.find(n => n.id === rel.to);
      
      if (sourceNode && targetNode) {
        edges.push({
          id: `${rel.from}-${rel.to}`,
          source: rel.from,
          target: rel.to,
          type: 'smoothstep',
          animated: true
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * Format the response
   */
  formatResponse(architecture, scalabilityAnalysis, recommendations) {
    return `# Architecture Design

## Overview
${architecture.overview.description}

**Pattern:** ${architecture.overview.pattern}
**Scale:** ${architecture.overview.scale}

## Components
${architecture.components.map(comp => 
  `### ${comp.name}
- **Type:** ${comp.type}
- **Description:** ${comp.description}
- **Technologies:** ${comp.technologies.join(', ')}
- **Responsibilities:** ${comp.responsibilities.join(', ')}`
).join('\n\n')}

## Scalability Analysis
${scalabilityAnalysis.currentCapacity}

**Expected Metrics:**
- Users: ${scalabilityAnalysis.metrics.expectedUsers}
- Response Time: ${scalabilityAnalysis.metrics.responseTime}
- Availability: ${scalabilityAnalysis.metrics.availability}

## Recommendations
${Object.entries(recommendations).map(([category, items]) => 
  `### ${category.charAt(0).toUpperCase() + category.slice(1)}
${items.map(item => `- ${item}`).join('\n')}`
).join('\n\n')}`;
  }
}