const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');

/**
 * Create a new user in the database
 * @param {Object} userData - User data from Firebase
 * @param {string} provider - Authentication provider (google, phone)
 * @returns {Object} - Created user object
 */
const createUser = async (userData, provider) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    const uuid = uuidv4();

    // Extract user data from Firebase user object
    const {
      uid: firebaseUid,
      email = null,
      displayName = null,
      photoURL = null,
      phoneNumber = null
    } = userData;

    // Insert user into database
    await connection.query(
      `INSERT INTO users 
       (uuid, firebase_uid, email, display_name, photo_url, provider, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid, firebaseUid, email, displayName, photoURL, provider, phoneNumber]
    );

    // Define default permissions
    const defaultPermissions = JSON.stringify({
      dashboard: { read: true, write: false },
      profile: { read: true, write: true }
    });

    // Insert default role - directly in the transaction
    await connection.query(
      `INSERT INTO user_roles 
       (user_uuid, role_name, permissions) 
       VALUES (?, ?, ?)`,
      [uuid, 'user', defaultPermissions]
    );

    // Commit transaction
    await connection.commit();

    // Return user without additional query
    const user = {
      uuid,
      firebase_uid: firebaseUid,
      email,
      display_name: displayName,
      photo_url: photoURL,
      provider,
      phone_number: phoneNumber,
      created_at: new Date(),
      updated_at: new Date(),
      roles: [
        {
          name: 'user',
          permissions: {
            dashboard: { read: true, write: false },
            profile: { read: true, write: true }
          }
        }
      ]
    };

    return user;
  } catch (error) {
    // Rollback transaction on error
    if (connection) await connection.rollback();
    console.error('Error creating user:', error);
    throw error;
  } finally {
    // Release connection
    if (connection) connection.release();
  }
};

/**
 * Assign default role to a user
 * @param {string} userUuid - User UUID
 * @param {Object} connection - Optional MySQL connection for transactions
 */
const assignDefaultRole = async (userUuid, connection) => {
  try {
    const conn = connection || getPool();
    
    // Define default permissions
    const defaultPermissions = JSON.stringify({
      dashboard: { read: true, write: false },
      profile: { read: true, write: true }
    });

    // Insert default role
    await conn.query(
      `INSERT INTO user_roles 
       (user_uuid, role_name, permissions) 
       VALUES (?, ?, ?)`,
      [userUuid, 'user', defaultPermissions]
    );
  } catch (error) {
    console.error('Error assigning default role:', error);
    throw error;
  }
};

/**
 * Get user by UUID
 * @param {string} uuid - User UUID
 * @param {Object} connection - Optional MySQL connection for transactions
 * @returns {Array} - User object and roles
 */
const getUserByUuid = async (uuid, connection) => {
  try {
    const conn = connection || getPool();
    
    // Get user
    const [userRows] = await conn.query(
      'SELECT * FROM users WHERE uuid = ?',
      [uuid]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    // Get user roles
    const [roleRows] = await conn.query(
      'SELECT * FROM user_roles WHERE user_uuid = ?',
      [uuid]
    );

    // Format user roles
    const roles = roleRows.map(role => ({
      name: role.role_name,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
    }));

    // Combine user and roles
    const user = {
      ...userRows[0],
      roles
    };

    return [user, null];
  } catch (error) {
    console.error('Error getting user by UUID:', error);
    return [null, error];
  }
};

/**
 * Get user by Firebase UID
 * @param {string} firebaseUid - Firebase UID
 * @returns {Array} - User object and roles
 */
const getUserByFirebaseUid = async (firebaseUid) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    // Get user
    const [userRows] = await connection.query(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [firebaseUid]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    // Get user roles
    const [roleRows] = await connection.query(
      'SELECT * FROM user_roles WHERE user_uuid = ?',
      [userRows[0].uuid]
    );

    // Format user roles
    const roles = roleRows.map(role => ({
      name: role.role_name,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
    }));

    // Combine user and roles
    const user = {
      ...userRows[0],
      roles
    };

    // Commit transaction
    await connection.commit();
    
    return [user, null];
  } catch (error) {
    // Rollback transaction on error
    if (connection) await connection.rollback();
    console.error('Error getting user by Firebase UID:', error);
    return [null, error];
  } finally {
    // Release connection
    if (connection) connection.release();
  }
};

/**
 * Update user profile
 * @param {string} uuid - User UUID
 * @param {Object} updateData - Data to update
 * @returns {Array} - Updated user object
 */
const updateUser = async (uuid, updateData) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    // Filter allowed fields to update
    const allowedFields = ['displayName', 'photoUrl', 'phoneNumber'];
    const updates = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .map(key => {
        // Convert camelCase to snake_case for database
        const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return { field: dbField, value: updateData[key] };
      });
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Construct UPDATE query
    const setClause = updates.map(update => `${update.field} = ?`).join(', ');
    const values = [...updates.map(update => update.value), uuid];
    
    // Update user
    await connection.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE uuid = ?`,
      values
    );

    // Get user data after update
    const [userRows] = await connection.query(
      'SELECT * FROM users WHERE uuid = ?',
      [uuid]
    );

    if (userRows.length === 0) {
      throw new Error('User not found after update');
    }

    // Get user roles
    const [roleRows] = await connection.query(
      'SELECT * FROM user_roles WHERE user_uuid = ?',
      [uuid]
    );

    // Format user roles
    const roles = roleRows.map(role => ({
      name: role.role_name,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
    }));

    // Combine user and roles
    const user = {
      ...userRows[0],
      roles
    };

    // Commit transaction
    await connection.commit();
    
    return [user, null];
  } catch (error) {
    // Rollback transaction on error
    if (connection) await connection.rollback();
    console.error('Error updating user:', error);
    return [null, error];
  } finally {
    // Release connection
    if (connection) connection.release();
  }
};

module.exports = {
  createUser,
  getUserByUuid,
  getUserByFirebaseUid,
  updateUser
}; 