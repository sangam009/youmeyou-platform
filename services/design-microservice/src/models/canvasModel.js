import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3308,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'designmicroservice'
};

const canvasSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Project'
  },
  content: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Canvas = mongoose.model('Canvas', canvasSchema);

class CanvasModel {
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
      
      // Create canvas_designs table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS canvas_designs (
          id VARCHAR(255) PRIMARY KEY,
          project_id INT,
          name VARCHAR(255) NOT NULL,
          canvas_data JSON NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          version INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_project_id (project_id),
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB
      `);
      
      connection.release();
      logger.info('Canvas database tables initialized successfully');
    } catch (error) {
      logger.error('Error initializing canvas database:', error);
    }
  }

  async create(canvas) {
    try {
      const connection = await this.pool.getConnection();
      
      const [result] = await connection.execute(
        `INSERT INTO canvas_designs 
         (id, project_id, name, canvas_data, user_id, version, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canvas.id,
          canvas.projectId,
          canvas.name,
          JSON.stringify(canvas.canvasData),
          canvas.userId,
          canvas.version,
          canvas.created_at,
          canvas.updated_at
        ]
      );
      
      connection.release();
      
      logger.info(`Canvas created with ID: ${canvas.id}`);
      
      // Return the created canvas
      return await this.findById(canvas.id);
    } catch (error) {
      logger.error('Error creating canvas:', error);
      throw error;
    }
  }

  async findById(canvasId, userId = null) {
    try {
      const connection = await this.pool.getConnection();
      
      let query = 'SELECT * FROM canvas_designs WHERE id = ?';
      let params = [canvasId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      const [rows] = await connection.execute(query, params);
      connection.release();
      
      if (rows.length === 0) {
        return null;
      }
      
      const canvas = rows[0];
      return {
        id: canvas.id,
        projectId: canvas.project_id,
        name: canvas.name,
        canvasData: JSON.parse(canvas.canvas_data),
        userId: canvas.user_id,
        version: canvas.version,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      };
    } catch (error) {
      logger.error('Error finding canvas by ID:', error);
      throw error;
    }
  }

  async update(canvasId, updateData) {
    try {
      const connection = await this.pool.getConnection();
      
      const setFields = [];
      const values = [];
      
      if (updateData.name) {
        setFields.push('name = ?');
        values.push(updateData.name);
      }
      
      if (updateData.canvasData) {
        setFields.push('canvas_data = ?');
        values.push(JSON.stringify(updateData.canvasData));
      }
      
      if (updateData.version) {
        setFields.push('version = ?');
        values.push(updateData.version);
      }
      
      setFields.push('updated_at = ?');
      values.push(updateData.updated_at);
      
      values.push(canvasId);
      
      const [result] = await connection.execute(
        `UPDATE canvas_designs SET ${setFields.join(', ')} WHERE id = ?`,
        values
      );
      
      connection.release();
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      logger.info(`Canvas updated: ${canvasId}`);
      
      // Return the updated canvas
      return await this.findById(canvasId);
    } catch (error) {
      logger.error('Error updating canvas:', error);
      throw error;
    }
  }

  async delete(canvasId, userId) {
    try {
      const connection = await this.pool.getConnection();
      
      const [result] = await connection.execute(
        'DELETE FROM canvas_designs WHERE id = ? AND user_id = ?',
        [canvasId, userId]
      );
      
      connection.release();
      
      logger.info(`Canvas deleted: ${canvasId}`);
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting canvas:', error);
      throw error;
    }
  }

  async findByProject(projectId, userId) {
    try {
      const connection = await this.pool.getConnection();
      
      const [rows] = await connection.execute(
        'SELECT * FROM canvas_designs WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC',
        [projectId, userId]
      );
      
      connection.release();
      
      return rows.map(canvas => ({
        id: canvas.id,
        projectId: canvas.project_id,
        name: canvas.name,
        canvasData: JSON.parse(canvas.canvas_data),
        userId: canvas.user_id,
        version: canvas.version,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      }));
    } catch (error) {
      logger.error('Error finding canvases by project:', error);
      throw error;
    }
  }

  async findByUser(userId, limit = 50, offset = 0) {
    try {
      const connection = await this.pool.getConnection();
      
      const [rows] = await connection.execute(
        'SELECT * FROM canvas_designs WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );
      
      connection.release();
      
      return rows.map(canvas => ({
        id: canvas.id,
        projectId: canvas.project_id,
        name: canvas.name,
        canvasData: JSON.parse(canvas.canvas_data),
        userId: canvas.user_id,
        version: canvas.version,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
      }));
    } catch (error) {
      logger.error('Error finding canvases by user:', error);
      throw error;
    }
  }

  async searchCanvases(searchTerm, userId, limit = 20) {
    try {
      const connection = await this.pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT * FROM canvas_designs 
         WHERE user_id = ? AND name LIKE ? 
         ORDER BY updated_at DESC LIMIT ?`,
        [userId, `%${searchTerm}%`, limit]
      );
      
      connection.release();
      
      return rows.map(canvas => ({
        id: canvas.id,
        projectId: canvas.project_id,
        name: canvas.name,
        canvasData: JSON.parse(canvas.canvas_data),
        userId: canvas.user_id,
        version: canvas.version,
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
      const connection = await this.pool.getConnection();
      
      const [totalRows] = await connection.execute(
        'SELECT COUNT(*) as total FROM canvas_designs WHERE user_id = ?',
        [userId]
      );
      
      const [recentRows] = await connection.execute(
        `SELECT COUNT(*) as recent FROM canvas_designs 
         WHERE user_id = ? AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [userId]
      );
      
      connection.release();
      
      return {
        total_canvases: totalRows[0].total,
        recent_canvases: recentRows[0].recent,
        user_id: userId
      };
    } catch (error) {
      logger.error('Error getting canvas stats:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
      logger.info('Canvas database connection pool closed');
    } catch (error) {
      logger.error('Error closing canvas database connection:', error);
    }
  }
}

const canvasModel = new CanvasModel();
export default canvasModel; 