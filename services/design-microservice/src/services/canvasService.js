const { v4: uuidv4 } = require('uuid');
const ProjectMetadataModel = require('../models/projectMetadataModel');
const CanvasContentModel = require('../models/canvasContentModel');
const logger = require('../utils/logger');

class CanvasService {
  constructor() {
    this.projectMetadataModel = new ProjectMetadataModel();
    this.canvasContentModel = new CanvasContentModel();
  }

  async createCanvas(canvasData) {
    try {
      const canvasId = uuidv4();
      const metadataId = uuidv4();
      const now = new Date();
      
      logger.info(`Creating canvas with ID: ${canvasId}`);
      
      // Create metadata in MySQL
      const metadata = {
        id: metadataId,
        projectId: canvasData.projectId,
        name: canvasData.name || 'Untitled Architecture',
        description: canvasData.description || '',
        canvasId: canvasId,
        userId: canvasData.userId,
        version: 1,
        tags: canvasData.tags || [],
        isTemplate: canvasData.isTemplate || false,
        isPublic: canvasData.isPublic || false,
        canvasType: canvasData.canvasType || 'design',
        thumbnailUrl: canvasData.thumbnailUrl || null,
        created_at: now,
        updated_at: now
      };
      
      // Create content in MongoDB
      const content = {
        canvasId: canvasId,
        projectId: canvasData.projectId,
        userId: canvasData.userId,
        nodes: canvasData.canvasData?.nodes || [],
        edges: canvasData.canvasData?.edges || [],
        viewport: canvasData.canvasData?.viewport || { x: 0, y: 0, zoom: 1 },
        backgroundType: canvasData.backgroundType || 'dots',
        gridSize: canvasData.gridSize || 20,
        snapToGrid: canvasData.snapToGrid || true,
        theme: canvasData.theme || 'light',
        tags: canvasData.tags || [],
        customProperties: canvasData.customProperties || {}
      };
      
      // Create both metadata and content
      const createdMetadata = await this.projectMetadataModel.createDesignMetadata(metadata);
      const createdContent = await this.canvasContentModel.createCanvas(content);
      
      // Update project stats
      await this.updateProjectStats(canvasData.userId, canvasData.projectId);
      
      // Return combined result
      return {
        id: canvasId,
        metadata: createdMetadata,
        content: {
          nodes: createdContent.nodes,
          edges: createdContent.edges,
          viewport: createdContent.viewport
        },
        analytics: createdContent.analytics
      };
    } catch (error) {
      logger.error('Error in canvasService.createCanvas:', error);
      throw error;
    }
  }

  async getCanvasById(canvasId, userId) {
    try {
      logger.info(`Getting canvas ${canvasId} for user ${userId}`);
      
      // Get metadata from MySQL
      const metadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, userId);
      if (!metadata) {
        return null;
      }
      
      // Get content from MongoDB
      const content = await this.canvasContentModel.findByCanvasId(metadata.canvasId);
      if (!content) {
        return null;
      }
      
      // Update last accessed time
      await this.projectMetadataModel.updateDesignMetadata(metadata.id, {
        lastAccessedAt: new Date()
      });
      
      // Return combined result
      return {
        id: canvasId,
        metadata: metadata,
        canvasData: {
          nodes: content.nodes,
          edges: content.edges,
          viewport: content.viewport
        },
        collaboration: content.collaboration,
        analytics: content.analytics,
        created_at: metadata.created_at,
        updated_at: content.updated_at
      };
    } catch (error) {
      logger.error('Error in canvasService.getCanvasById:', error);
      throw error;
    }
  }

  async updateCanvas(canvasId, updateData) {
    try {
      logger.info(`Updating canvas ${canvasId}`);
      
      // Get existing metadata
      const existingMetadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, updateData.userId);
      if (!existingMetadata) {
        return null;
      }

      const now = new Date();
      let updatedMetadata = null;
      let updatedContent = null;

      // Update metadata in MySQL if needed
      if (updateData.name || updateData.description || updateData.tags) {
        const metadataUpdate = {
          updated_at: now
        };
        
        if (updateData.name) metadataUpdate.name = updateData.name;
        if (updateData.description) metadataUpdate.description = updateData.description;
        if (updateData.tags) metadataUpdate.tags = updateData.tags;
        
        updatedMetadata = await this.projectMetadataModel.updateDesignMetadata(
          existingMetadata.id, 
          metadataUpdate
        );
      }

      // Update content in MongoDB if needed
      if (updateData.canvasData) {
        const contentUpdate = {
          nodes: updateData.canvasData.nodes,
          edges: updateData.canvasData.edges,
          viewport: updateData.canvasData.viewport,
          versionComment: updateData.versionComment || 'Canvas updated'
        };
        
        updatedContent = await this.canvasContentModel.updateCanvas(
          existingMetadata.canvasId, 
          contentUpdate, 
          updateData.userId
        );
      }

      // Update project stats
      await this.updateProjectStats(updateData.userId, existingMetadata.projectId);
      
      // Return updated canvas
      return await this.getCanvasById(canvasId, updateData.userId);
    } catch (error) {
      logger.error('Error in canvasService.updateCanvas:', error);
      throw error;
    }
  }

  async deleteCanvas(canvasId, userId) {
    try {
      logger.info(`Deleting canvas ${canvasId} by user ${userId}`);
      
      // Get metadata first
      const metadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, userId);
      if (!metadata) {
        return false;
      }
      
      // Delete content from MongoDB
      await this.canvasContentModel.deleteCanvas(metadata.canvasId);
      
      // Delete metadata from MySQL
      const result = await this.projectMetadataModel.deleteDesignMetadata(metadata.id, userId);
      
      // Update project stats
      await this.updateProjectStats(userId, metadata.projectId);
      
      return result;
    } catch (error) {
      logger.error('Error in canvasService.deleteCanvas:', error);
      throw error;
    }
  }

  async getCanvasesByProject(projectId, userId) {
    try {
      logger.info(`Getting canvases for project ${projectId} by user ${userId}`);
      
      // Get content from MongoDB for this project
      const canvasContents = await this.canvasContentModel.findByProject(projectId, userId);
      
      // Get metadata for all these canvases
      const results = [];
      for (const content of canvasContents) {
        const metadata = await this.projectMetadataModel.findDesignMetadataById(content.canvasId, userId);
        if (metadata) {
          results.push({
            id: content.canvasId,
            metadata: metadata,
            analytics: content.analytics,
            preview: {
              nodeCount: content.nodes.length,
              edgeCount: content.edges.length,
              lastModified: content.updated_at
            }
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error in canvasService.getCanvasesByProject:', error);
      throw error;
    }
  }

  async duplicateCanvas(canvasId, duplicateData) {
    try {
      logger.info(`Duplicating canvas ${canvasId}`);
      
      // Get original canvas
      const originalCanvas = await this.getCanvasById(canvasId, duplicateData.userId);
      if (!originalCanvas) {
        return null;
      }

      // Create duplicate with new IDs
      const duplicateCanvasData = {
        projectId: originalCanvas.metadata.projectId,
        name: duplicateData.name,
        description: originalCanvas.metadata.description,
        userId: duplicateData.userId,
        canvasData: originalCanvas.canvasData,
        tags: originalCanvas.metadata.tags,
        canvasType: originalCanvas.metadata.canvasType
      };
      
      const result = await this.createCanvas(duplicateCanvasData);
      return result;
    } catch (error) {
      logger.error('Error in canvasService.duplicateCanvas:', error);
      throw error;
    }
  }

  async getCanvasVersions(canvasId, userId) {
    try {
      logger.info(`Getting versions for canvas ${canvasId}`);
      
      // Get metadata to get the actual canvas ID
      const metadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, userId);
      if (!metadata) {
        return [];
      }
      
      // Get versions from MongoDB
      const versions = await this.canvasContentModel.getVersions(metadata.canvasId);
      return versions;
    } catch (error) {
      logger.error('Error in canvasService.getCanvasVersions:', error);
      throw error;
    }
  }

  async restoreCanvasVersion(canvasId, version, userId) {
    try {
      logger.info(`Restoring canvas ${canvasId} to version ${version}`);
      
      // Get metadata to get the actual canvas ID
      const metadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, userId);
      if (!metadata) {
        return null;
      }
      
      // Restore version in MongoDB
      const restoredCanvas = await this.canvasContentModel.restoreVersion(metadata.canvasId, version, userId);
      
      // Update metadata version
      await this.projectMetadataModel.updateDesignMetadata(metadata.id, {
        version: version,
        updated_at: new Date()
      });
      
      return await this.getCanvasById(canvasId, userId);
    } catch (error) {
      logger.error('Error in canvasService.restoreCanvasVersion:', error);
      throw error;
    }
  }

  async exportCanvas(canvasId, format, userId) {
    try {
      logger.info(`Exporting canvas ${canvasId} in format ${format}`);
      
      const canvas = await this.getCanvasById(canvasId, userId);
      if (!canvas) {
        return null;
      }

      switch (format) {
        case 'json':
          return {
            format: 'json',
            data: canvas.canvasData,
            metadata: {
              name: canvas.metadata.name,
              version: canvas.metadata.version,
              exported_at: new Date(),
              canvas_id: canvasId
            }
          };

        case 'docker-compose':
          return this.generateDockerCompose(canvas.canvasData);

        case 'kubernetes':
          return this.generateKubernetes(canvas.canvasData);

        default:
          return {
            format: 'json',
            data: canvas.canvasData
          };
      }
    } catch (error) {
      logger.error('Error in canvasService.exportCanvas:', error);
      throw error;
    }
  }

  generateDockerCompose(canvasData) {
    try {
      // Parse canvas nodes and generate docker-compose.yml
      const nodes = canvasData.nodes || [];
      const services = {};
      const networks = {
        'app-network': {
          driver: 'overlay',
          attachable: true
        }
      };
      const volumes = {};

      nodes.forEach(node => {
        const serviceType = node.data?.serviceType;
        const serviceName = node.data?.label?.toLowerCase().replace(/\s+/g, '-') || `service-${node.id}`;
        
        switch (serviceType) {
          case 'microservice':
            services[serviceName] = {
              build: '.',
              ports: [`${node.data?.port || 3000}:${node.data?.port || 3000}`],
              environment: this.parseEnvironmentVariables(node.data?.env || ''),
              networks: ['app-network'],
              restart: 'unless-stopped',
              deploy: {
                mode: 'replicated',
                replicas: node.data?.replicas || 1,
                restart_policy: {
                  condition: 'on-failure',
                  max_attempts: 3,
                  window: '120s'
                }
              },
              healthcheck: {
                test: [`CMD`, `curl`, `-f`, `http://localhost:${node.data?.port || 3000}/health`],
                interval: '30s',
                timeout: '10s',
                retries: 3
              }
            };
            break;

          case 'database':
            const dbType = node.data?.dbType || 'mysql';
            const dbName = serviceName;
            
            if (dbType === 'mysql') {
              services[dbName] = {
                image: 'mysql:8.0',
                environment: {
                  MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD}',
                  MYSQL_DATABASE: '${MYSQL_DATABASE}'
                },
                volumes: [`${dbName}-data:/var/lib/mysql`],
                networks: ['app-network'],
                restart: 'unless-stopped',
                deploy: {
                  placement: {
                    constraints: ['node.role == manager']
                  }
                },
                healthcheck: {
                  test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost'],
                  interval: '30s',
                  timeout: '10s',
                  retries: 5
                }
              };
              volumes[`${dbName}-data`] = {};
            } else if (dbType === 'mongodb') {
              services[dbName] = {
                image: 'mongo:7.0',
                environment: {
                  MONGO_INITDB_ROOT_USERNAME: '${MONGO_USERNAME}',
                  MONGO_INITDB_ROOT_PASSWORD: '${MONGO_PASSWORD}'
                },
                volumes: [
                  `${dbName}-data:/data/db`,
                  `${dbName}-config:/data/configdb`
                ],
                networks: ['app-network'],
                restart: 'unless-stopped',
                deploy: {
                  placement: {
                    constraints: ['node.role == manager']
                  }
                },
                healthcheck: {
                  test: ['CMD', 'mongosh', '--eval', 'db.adminCommand("ping")'],
                  interval: '30s',
                  timeout: '10s',
                  retries: 5
                }
              };
              volumes[`${dbName}-data`] = {};
              volumes[`${dbName}-config`] = {};
            }
            break;

          case 'cache':
            services[serviceName] = {
              image: 'redis:alpine',
              command: 'redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}',
              volumes: [`${serviceName}-data:/data`],
              networks: ['app-network'],
              restart: 'unless-stopped',
              deploy: {
                placement: {
                  constraints: ['node.role == manager']
                }
              },
              healthcheck: {
                test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD}', 'ping'],
                interval: '10s',
                timeout: '5s',
                retries: 5
              }
            };
            volumes[`${serviceName}-data`] = {};
            break;

          case 'load-balancer':
            services[serviceName] = {
              image: 'nginx:alpine',
              ports: ['80:80', '443:443'],
              volumes: [
                './nginx/conf:/etc/nginx/conf.d',
                './nginx/certs:/etc/nginx/certs',
                './nginx/logs:/var/log/nginx'
              ],
              networks: ['app-network'],
              restart: 'unless-stopped',
              deploy: {
                placement: {
                  constraints: ['node.role == manager']
                }
              }
            };
            break;

          case 'queue':
            services[serviceName] = {
              image: 'rabbitmq:3-management-alpine',
              environment: {
                RABBITMQ_DEFAULT_USER: '${RABBITMQ_USER}',
                RABBITMQ_DEFAULT_PASS: '${RABBITMQ_PASSWORD}'
              },
              volumes: [`${serviceName}-data:/var/lib/rabbitmq`],
              networks: ['app-network'],
              restart: 'unless-stopped',
              deploy: {
                placement: {
                  constraints: ['node.role == manager']
                }
              }
            };
            volumes[`${serviceName}-data`] = {};
            break;
        }
      });

      const dockerComposeContent = {
        version: '3.8',
        services,
        networks,
        volumes
      };

      return {
        format: 'docker-compose',
        filename: 'docker-compose.yml',
        content: this.yamlStringify(dockerComposeContent),
        metadata: {
          generated_at: new Date(),
          node_count: nodes.length,
          service_count: Object.keys(services).length
        }
      };
    } catch (error) {
      logger.error('Error generating Docker Compose:', error);
      throw error;
    }
  }

  generateKubernetes(canvasData) {
    // Simplified Kubernetes generation for Docker Swarm focus
    return {
      format: 'kubernetes',
      message: 'Kubernetes export will be available in future releases. Currently focusing on Docker Swarm deployment.',
      suggested_alternative: 'docker-compose'
    };
  }

  yamlStringify(obj) {
    // Simple YAML stringifier for Docker Compose
    return JSON.stringify(obj, null, 2)
      .replace(/"/g, '')
      .replace(/,\n/g, '\n')
      .replace(/{\n/g, '\n')
      .replace(/}/g, '');
  }

  parseEnvironmentVariables(envString) {
    const env = {};
    if (envString) {
      envString.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          env[key.trim()] = value.trim();
        }
      });
    }
    return env;
  }

  async getCanvasAnalytics(canvasId, userId) {
    try {
      logger.info(`Getting analytics for canvas ${canvasId}`);
      
      const metadata = await this.projectMetadataModel.findDesignMetadataById(canvasId, userId);
      if (!metadata) {
        return null;
      }
      
      const content = await this.canvasContentModel.findByCanvasId(metadata.canvasId);
      if (!content) {
        return null;
      }

      const analytics = {
        canvas_id: canvasId,
        metadata: {
          name: metadata.name,
          created_at: metadata.created_at,
          last_accessed: metadata.lastAccessedAt
        },
        content_stats: content.analytics,
        component_analysis: this.analyzeComponentTypes(content.nodes),
        complexity_score: this.calculateComplexityScore(content.nodes, content.edges),
        suggestions: this.generateArchitectureSuggestions(content.nodes, content.edges)
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting canvas analytics:', error);
      throw error;
    }
  }

  analyzeComponentTypes(nodes) {
    const componentCount = {};
    nodes.forEach(node => {
      const type = node.data?.serviceType || 'unknown';
      componentCount[type] = (componentCount[type] || 0) + 1;
    });
    return componentCount;
  }

  calculateComplexityScore(nodes, edges) {
    // Simple complexity calculation
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const avgConnections = nodeCount > 0 ? edgeCount / nodeCount : 0;
    
    let complexity = 'Low';
    if (nodeCount > 10 || avgConnections > 3) {
      complexity = 'Medium';
    }
    if (nodeCount > 20 || avgConnections > 5) {
      complexity = 'High';
    }
    
    return {
      score: Math.min(10, Math.round(nodeCount * 0.5 + avgConnections * 2)),
      level: complexity,
      factors: {
        node_count: nodeCount,
        connection_count: edgeCount,
        avg_connections: avgConnections.toFixed(2)
      }
    };
  }

  generateArchitectureSuggestions(nodes, edges) {
    const suggestions = [];
    
    // Check for single points of failure
    const connectionCount = {};
    edges.forEach(edge => {
      connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
      connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
    });
    
    Object.entries(connectionCount).forEach(([nodeId, count]) => {
      if (count > 5) {
        suggestions.push({
          type: 'performance',
          severity: 'medium',
          message: `Node ${nodeId} has many connections (${count}). Consider load balancing.`,
          recommendation: 'Add load balancer or split responsibilities'
        });
      }
    });
    
    // Check for missing essential components
    const hasDatabase = nodes.some(node => node.data?.serviceType === 'database');
    const hasCache = nodes.some(node => node.data?.serviceType === 'cache');
    const hasLoadBalancer = nodes.some(node => node.data?.serviceType === 'load-balancer');
    
    if (!hasDatabase && nodes.length > 2) {
      suggestions.push({
        type: 'architecture',
        severity: 'high',
        message: 'No database component found in a multi-service architecture.',
        recommendation: 'Add a database for persistent storage'
      });
    }
    
    if (!hasCache && nodes.length > 5) {
      suggestions.push({
        type: 'performance',
        severity: 'low',
        message: 'Consider adding caching for better performance.',
        recommendation: 'Add Redis or similar caching solution'
      });
    }
    
    if (!hasLoadBalancer && nodes.length > 3) {
      suggestions.push({
        type: 'scalability',
        severity: 'medium',
        message: 'Consider adding load balancing for better scalability.',
        recommendation: 'Add nginx or similar load balancer'
      });
    }
    
    return suggestions;
  }

  async updateProjectStats(userId, projectId) {
    try {
      // Get canvas stats from MongoDB
      const canvasStats = await this.canvasContentModel.getCanvasStats(userId);
      
      // Update project stats in MySQL
      await this.projectMetadataModel.updateProjectStats(userId, projectId, {
        canvasCount: canvasStats.totalCanvases,
        totalNodes: canvasStats.totalNodes,
        totalConnections: canvasStats.totalEdges
      });
    } catch (error) {
      logger.error('Error updating project stats:', error);
      // Don't throw, as this is not critical
    }
  }

  async searchCanvases(query, userId, limit = 20) {
    try {
      logger.info(`Searching canvases for user ${userId} with query: ${query}`);
      
      const results = await this.canvasContentModel.searchCanvases(query, userId, limit);
      
      // Get metadata for search results
      const searchResults = [];
      for (const result of results) {
        const metadata = await this.projectMetadataModel.findDesignMetadataById(result.canvasId, userId);
        if (metadata) {
          searchResults.push({
            id: result.canvasId,
            metadata: metadata,
            analytics: result.analytics,
            match_score: 1.0 // Could implement actual scoring
          });
        }
      }
      
      return searchResults;
    } catch (error) {
      logger.error('Error searching canvases:', error);
      throw error;
    }
  }
}

module.exports = CanvasService; 