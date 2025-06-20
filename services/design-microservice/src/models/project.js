// Placeholder for Project model
// In future: define schema, DB integration, etc.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'designmicroservice',
});

const Project = {
  async create({ name, workspaceId, userId }) {
    const [result] = await pool.execute(
      'INSERT INTO projects (name, workspaceId, userId, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [name, workspaceId, userId]
    );
    return { id: result.insertId, name, workspaceId, userId };
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    return rows[0];
  },

  async findByWorkspaceId(workspaceId) {
    const [rows] = await pool.execute('SELECT * FROM projects WHERE workspaceId = ?', [workspaceId]);
    return rows;
  },

  async update(id, { name }) {
    await pool.execute('UPDATE projects SET name = ?, updatedAt = NOW() WHERE id = ?', [name, id]);
    return { id, name };
  },

  async delete(id) {
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    return { id };
  }
};

module.exports = Project;
