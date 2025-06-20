const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'designmicroservice',
});

const Workspace = {
  async create({ name, userId }) {
    const [result] = await pool.execute(
      'INSERT INTO workspaces (name, userId, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
      [name, userId]
    );
    return { id: result.insertId, name, userId };
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM workspaces WHERE id = ?', [id]);
    return rows[0];
  },

  async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM workspaces WHERE userId = ?', [userId]);
    return rows;
  },

  async update(id, { name }) {
    await pool.execute('UPDATE workspaces SET name = ?, updatedAt = NOW() WHERE id = ?', [name, id]);
    return { id, name };
  },

  async delete(id) {
    await pool.execute('DELETE FROM workspaces WHERE id = ?', [id]);
    return { id };
  }
};

module.exports = Workspace;
