const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// MySQL Database connection configuration for metadata
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3308,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'designmicroservice'
};

class ProjectMetadataModel {
  constructor() {
    this.pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      reconnect: true
    });
    
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      const connection = await this.pool.getConnection();
      
      // Create design_metadata table for project and design metadata
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS design_metadata (
          id VARCHAR(255) PRIMARY KEY,
          project_id INT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          canvas_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          version INT DEFAULT 1,
          tags JSON,
          is_template BOOLEAN DEFAULT FALSE,
          is_public BOOLEAN DEFAULT FALSE,
          canvas_type ENUM('design', 'architecture', 'database', 'api') DEFAULT 'design',
          thumbnail_url VARCHAR(500),
          last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_project_id (project_id),
          INDEX idx_user_id (user_id),
          INDEX idx_canvas_type (canvas_type),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at),
          INDEX idx_canvas_id (canvas_id),
          UNIQUE KEY unique_canvas_id (canvas_id)
        ) ENGINE=InnoDB
      `);

      // Create project_stats table for analytics
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS project_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          project_id INT,
          canvas_count INT DEFAULT 0,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_nodes INT DEFAULT 0,
          total_connections INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_project_id (project_id),
          UNIQUE KEY unique_user_project (user_id, project_id)
        ) ENGINE=InnoDB
      `);

      // Create collaboration_sessions table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS collaboration_sessions (
          id VARCHAR(255) PRIMARY KEY,
          canvas_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          session_data JSON,
          cursor_position JSON,
          is_active BOOLEAN DEFAULT TRUE,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_canvas_id (canvas_id),
          INDEX idx_user_id (user_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB
      `);
      
      connection.release();
      logger.info('Project metadata database tables initialized successfully');
    } catch (error) {
      logger.error('Error initializing project metadata database:', error);
    }
  }

  // Design Metadata CRUD Operations
  async createDesignMetadata(metadata) {
    try {
      const connection = await this.pool.getConnection();
      
      const [result] = await connection.execute(
        `INSERT INTO design_metadata 
         (id, project_id, name, description, canvas_id, user_id, version, tags, is_template, is_public, canvas_type, thumbnail_url, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.id,
          metadata.projectId,
          metadata.name,
          metadata.description || null,
          metadata.canvasId,
          metadata.userId,
          metadata.version || 1,
          JSON.stringify(metadata.tags || []),
          metadata.isTemplate || false,
          metadata.isPublic || false,
          metadata.canvasType || 'design',
          metadata.thumbnailUrl || null,
          metadata.created_at,
          metadata.updated_at
        ]
      );
      
      connection.release();
      logger.info(`Design metadata created with ID: ${metadata.id}`);
      
      return await this.findDesignMetadataById(metadata.id);
    } catch (error) {
      logger.error('Error creating design metadata:', error);
      throw error;
    }
  }

  async findDesignMetadataById(metadataId, userId = null) {
    try {
      const connection = await this.pool.getConnection();
      
      let query = 'SELECT * FROM design_metadata WHERE id = ?';
      let params = [metadataId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      const [rows] = await connection.execute(query, params);
      connection.release();
      
      if (rows.length === 0) {
        return null;
      }
      
      const metadata = rows[0];
      return {
        id: metadata.id,
        projectId: metadata.project_id,
        name: metadata.name,
        description: metadata.description,
        canvasId: metadata.canvas_id,
        userId: metadata.user_id,
        version: metadata.version,
        tags: JSON.parse(metadata.tags || '[]'),
        isTemplate: metadata.is_template,
        isPublic: metadata.is_public,
        canvasType: metadata.canvas_type,
        thumbnailUrl: metadata.thumbnail_url,
        lastAccessedAt: metadata.last_accessed_at,
        created_at: metadata.created_at,
        updated_at: metadata.updated_at
      };
    } catch (error) {
      logger.error('Error finding design metadata by ID:', error);
      throw error;
    }
  }

  async updateDesignMetadata(metadataId, updateData) {
    try {
      const connection = await this.pool.getConnection();
      
      const setFields = [];
      const values = [];
      
      const allowedFields = ['name', 'description', 'version', 'tags', 'isTemplate', 'isPublic', 'canvasType', 'thumbnailUrl'];
      
      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          if (field === 'tags') {
            setFields.push('tags = ?');
            values.push(JSON.stringify(updateData[field]));
          } else if (field === 'isTemplate') {
            setFields.push('is_template = ?');
            values.push(updateData[field]);
          } else if (field === 'isPublic') {
            setFields.push('is_public = ?');
            values.push(updateData[field]);
          } else if (field === 'canvasType') {
            setFields.push('canvas_type = ?');
            values.push(updateData[field]);
          } else if (field === 'thumbnailUrl') {
            setFields.push('thumbnail_url = ?');
            values.push(updateData[field]);
          } else {
            setFields.push(`${field} = ?`);
            values.push(updateData[field]);
          }
        }
      }
      
      if (setFields.length === 0) {
        return await this.findDesignMetadataById(metadataId);
      }
      
      setFields.push('updated_at = ?');
      values.push(updateData.updated_at || new Date());
      
      values.push(metadataId);
      
      const [result] = await connection.execute(
        `UPDATE design_metadata SET ${setFields.join(', ')} WHERE id = ?`,
        values
      );
      
      connection.release();
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      logger.info(`Design metadata updated: ${metadataId}`);
      return await this.findDesignMetadataById(metadataId);
    } catch (error) {
      logger.error('Error updating design metadata:', error);
      throw error;
    }
  }

  async deleteDesignMetadata(metadataId, userId) {
    try {
      const connection = await this.pool.getConnection();
      
      const [result] = await connection.execute(
        'DELETE FROM design_metadata WHERE id = ? AND user_id = ?',
        [metadataId, userId]
      );
      
      connection.release();
      
      logger.info(`Design metadata deleted: ${metadataId}`);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting design metadata:', error);
      throw error;
    }
  }

  // Project Statistics
  async updateProjectStats(userId, projectId, stats) {
    try {
      const connection = await this.pool.getConnection();
      
      await connection.execute(
        `INSERT INTO project_stats (user_id, project_id, canvas_count, total_nodes, total_connections, last_activity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         canvas_count = VALUES(canvas_count),
         total_nodes = VALUES(total_nodes),
         total_connections = VALUES(total_connections),
         last_activity = VALUES(last_activity),
         updated_at = VALUES(updated_at)`,
        [
          userId,
          projectId,
          stats.canvasCount || 0,
          stats.totalNodes || 0,
          stats.totalConnections || 0,
          new Date(),
          new Date(),
          new Date()
        ]
      );
      
      connection.release();
      logger.info(`Project stats updated for user: ${userId}, project: ${projectId}`);
    } catch (error) {
      logger.error('Error updating project stats:', error);
      throw error;
    }
  }

  async getProjectStats(userId, projectId = null) {
    try {
      const connection = await this.pool.getConnection();
      
      let query = 'SELECT * FROM project_stats WHERE user_id = ?';
      let params = [userId];
      
      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }
      
      const [rows] = await connection.execute(query, params);
      connection.release();
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        canvasCount: row.canvas_count,
        lastActivity: row.last_activity,
        totalNodes: row.total_nodes,
        totalConnections: row.total_connections,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

module.exports = ProjectMetadataModel; 