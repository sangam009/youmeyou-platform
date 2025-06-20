const { MongoClient, ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class CanvasContentModel {
  constructor() {
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.MONGODB_DB || 'designmicroservice';
    this.client = null;
    this.db = null;
    
    this.connect();
  }

  async connect() {
    try {
      this.client = new MongoClient(this.uri, {
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      
      // Create indexes for better performance
      await this.createIndexes();
      
      logger.info('Connected to MongoDB for canvas content');
    } catch (error) {
      logger.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      const canvasCollection = this.db.collection('canvas_content');
      const versionsCollection = this.db.collection('canvas_versions');
      
      // Indexes for canvas_content collection
      await canvasCollection.createIndexes([
        { key: { canvas_id: 1 }, unique: true },
        { key: { user_id: 1 } },
        { key: { project_id: 1 } },
        { key: { updated_at: -1 } },
        { key: { 'nodes.type': 1 } },
        { key: { 'metadata.tags': 1 } }
      ]);

      // Indexes for canvas_versions collection
      await versionsCollection.createIndexes([
        { key: { canvas_id: 1, version: -1 } },
        { key: { created_at: -1 } },
        { key: { user_id: 1 } }
      ]);

      logger.info('MongoDB indexes created successfully');
    } catch (error) {
      logger.error('Error creating MongoDB indexes:', error);
    }
  }

  async createCanvas(canvasData) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const document = {
        canvas_id: canvasData.canvasId,
        project_id: canvasData.projectId,
        user_id: canvasData.userId,
        nodes: canvasData.nodes || [],
        edges: canvasData.edges || [],
        viewport: canvasData.viewport || { x: 0, y: 0, zoom: 1 },
        metadata: {
          backgroundType: canvasData.backgroundType || 'dots',
          gridSize: canvasData.gridSize || 20,
          snapToGrid: canvasData.snapToGrid || true,
          theme: canvasData.theme || 'light',
          tags: canvasData.tags || [],
          customProperties: canvasData.customProperties || {}
        },
        collaboration: {
          cursors: {},
          selections: {},
          activeUsers: []
        },
        analytics: {
          nodeCount: canvasData.nodes ? canvasData.nodes.length : 0,
          edgeCount: canvasData.edges ? canvasData.edges.length : 0,
          lastModified: new Date(),
          viewCount: 0,
          editCount: 1
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await collection.insertOne(document);
      
      // Create initial version
      await this.createVersion(canvasData.canvasId, document, 1, canvasData.userId, 'Initial canvas creation');
      
      logger.info(`Canvas content created with ID: ${canvasData.canvasId}`);
      
      return await this.findByCanvasId(canvasData.canvasId);
    } catch (error) {
      logger.error('Error creating canvas content:', error);
      throw error;
    }
  }

  async findByCanvasId(canvasId) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const canvas = await collection.findOne({ canvas_id: canvasId });
      
      if (!canvas) {
        return null;
      }

      // Update view count
      await collection.updateOne(
        { canvas_id: canvasId },
        { 
          $inc: { 'analytics.viewCount': 1 },
          $set: { 'analytics.lastAccessed': new Date() }
        }
      );

      return {
        canvasId: canvas.canvas_id,
        projectId: canvas.project_id,
        userId: canvas.user_id,
        nodes: canvas.nodes,
        edges: canvas.edges,
        viewport: canvas.viewport,
        metadata: canvas.metadata,
        collaboration: canvas.collaboration,
        analytics: canvas.analytics,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      };
    } catch (error) {
      logger.error('Error finding canvas by ID:', error);
      throw error;
    }
  }

  async updateCanvas(canvasId, updateData, userId) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const updateFields = {};
      
      if (updateData.nodes) updateFields.nodes = updateData.nodes;
      if (updateData.edges) updateFields.edges = updateData.edges;
      if (updateData.viewport) updateFields.viewport = updateData.viewport;
      if (updateData.metadata) updateFields.metadata = updateData.metadata;
      if (updateData.collaboration) updateFields.collaboration = updateData.collaboration;
      
      // Always update analytics
      updateFields['analytics.lastModified'] = new Date();
      updateFields['analytics.nodeCount'] = updateData.nodes ? updateData.nodes.length : undefined;
      updateFields['analytics.edgeCount'] = updateData.edges ? updateData.edges.length : undefined;
      updateFields.updated_at = new Date();
      
      // Remove undefined values
      Object.keys(updateFields).forEach(key => {
        if (updateFields[key] === undefined) {
          delete updateFields[key];
        }
      });

      const result = await collection.updateOne(
        { canvas_id: canvasId },
        { 
          $set: updateFields,
          $inc: { 'analytics.editCount': 1 }
        }
      );

      if (result.matchedCount === 0) {
        return null;
      }

      // Create version if this is a significant update
      if (updateData.nodes || updateData.edges) {
        const canvas = await collection.findOne({ canvas_id: canvasId });
        const latestVersion = await this.getLatestVersion(canvasId);
        const newVersion = latestVersion ? latestVersion.version + 1 : 1;
        
        await this.createVersion(
          canvasId, 
          canvas, 
          newVersion, 
          userId, 
          updateData.versionComment || 'Canvas updated'
        );
      }

      logger.info(`Canvas content updated: ${canvasId}`);
      
      return await this.findByCanvasId(canvasId);
    } catch (error) {
      logger.error('Error updating canvas content:', error);
      throw error;
    }
  }

  async deleteCanvas(canvasId) {
    try {
      const collection = this.db.collection('canvas_content');
      const versionsCollection = this.db.collection('canvas_versions');
      
      // Delete canvas content
      const result = await collection.deleteOne({ canvas_id: canvasId });
      
      // Delete all versions
      await versionsCollection.deleteMany({ canvas_id: canvasId });
      
      logger.info(`Canvas content deleted: ${canvasId}`);
      
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting canvas content:', error);
      throw error;
    }
  }

  async findByProject(projectId, userId, limit = 50, skip = 0) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const canvases = await collection.find(
        { project_id: projectId, user_id: userId }
      )
      .sort({ updated_at: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

      return canvases.map(canvas => ({
        canvasId: canvas.canvas_id,
        projectId: canvas.project_id,
        userId: canvas.user_id,
        nodes: canvas.nodes,
        edges: canvas.edges,
        viewport: canvas.viewport,
        metadata: canvas.metadata,
        analytics: canvas.analytics,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      }));
    } catch (error) {
      logger.error('Error finding canvases by project:', error);
      throw error;
    }
  }

  // Version Management
  async createVersion(canvasId, canvasData, version, userId, comment = '') {
    try {
      const versionsCollection = this.db.collection('canvas_versions');
      
      const versionDocument = {
        canvas_id: canvasId,
        version,
        user_id: userId,
        comment,
        snapshot: {
          nodes: canvasData.nodes,
          edges: canvasData.edges,
          viewport: canvasData.viewport,
          metadata: canvasData.metadata
        },
        created_at: new Date()
      };

      await versionsCollection.insertOne(versionDocument);
      
      // Keep only last 10 versions
      const versions = await versionsCollection.find({ canvas_id: canvasId })
        .sort({ version: -1 })
        .skip(10)
        .toArray();
        
      if (versions.length > 0) {
        const oldVersions = versions.map(v => v.version);
        await versionsCollection.deleteMany({
          canvas_id: canvasId,
          version: { $in: oldVersions }
        });
      }

      logger.info(`Version ${version} created for canvas: ${canvasId}`);
    } catch (error) {
      logger.error('Error creating canvas version:', error);
      throw error;
    }
  }

  async getVersions(canvasId, limit = 10) {
    try {
      const versionsCollection = this.db.collection('canvas_versions');
      
      const versions = await versionsCollection.find({ canvas_id: canvasId })
        .sort({ version: -1 })
        .limit(limit)
        .toArray();

      return versions.map(version => ({
        canvasId: version.canvas_id,
        version: version.version,
        userId: version.user_id,
        comment: version.comment,
        created_at: version.created_at
      }));
    } catch (error) {
      logger.error('Error getting canvas versions:', error);
      throw error;
    }
  }

  async getLatestVersion(canvasId) {
    try {
      const versionsCollection = this.db.collection('canvas_versions');
      
      const version = await versionsCollection.findOne(
        { canvas_id: canvasId },
        { sort: { version: -1 } }
      );

      return version;
    } catch (error) {
      logger.error('Error getting latest version:', error);
      throw error;
    }
  }

  async restoreVersion(canvasId, version, userId) {
    try {
      const versionsCollection = this.db.collection('canvas_versions');
      
      const versionDoc = await versionsCollection.findOne({
        canvas_id: canvasId,
        version
      });

      if (!versionDoc) {
        throw new Error(`Version ${version} not found for canvas ${canvasId}`);
      }

      // Update canvas with version data
      await this.updateCanvas(canvasId, {
        nodes: versionDoc.snapshot.nodes,
        edges: versionDoc.snapshot.edges,
        viewport: versionDoc.snapshot.viewport,
        metadata: versionDoc.snapshot.metadata,
        versionComment: `Restored to version ${version}`
      }, userId);

      logger.info(`Canvas ${canvasId} restored to version ${version}`);
      
      return await this.findByCanvasId(canvasId);
    } catch (error) {
      logger.error('Error restoring canvas version:', error);
      throw error;
    }
  }

  // Search and Analytics
  async searchCanvases(query, userId, limit = 20) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const searchQuery = {
        user_id: userId,
        $or: [
          { 'metadata.tags': { $regex: query, $options: 'i' } },
          { 'nodes.data.label': { $regex: query, $options: 'i' } },
          { 'metadata.customProperties': { $regex: query, $options: 'i' } }
        ]
      };

      const canvases = await collection.find(searchQuery)
        .sort({ 'analytics.lastModified': -1 })
        .limit(limit)
        .toArray();

      return canvases.map(canvas => ({
        canvasId: canvas.canvas_id,
        projectId: canvas.project_id,
        analytics: canvas.analytics,
        metadata: canvas.metadata,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      }));
    } catch (error) {
      logger.error('Error searching canvases:', error);
      throw error;
    }
  }

  async getCanvasStats(userId) {
    try {
      const collection = this.db.collection('canvas_content');
      
      const stats = await collection.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: null,
            totalCanvases: { $sum: 1 },
            totalNodes: { $sum: '$analytics.nodeCount' },
            totalEdges: { $sum: '$analytics.edgeCount' },
            totalViews: { $sum: '$analytics.viewCount' },
            totalEdits: { $sum: '$analytics.editCount' },
            lastActivity: { $max: '$analytics.lastModified' }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalCanvases: 0,
        totalNodes: 0,
        totalEdges: 0,
        totalViews: 0,
        totalEdits: 0,
        lastActivity: null
      };
    } catch (error) {
      logger.error('Error getting canvas stats:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }
}

module.exports = CanvasContentModel; 