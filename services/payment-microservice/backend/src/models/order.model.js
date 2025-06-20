/**
 * Order Model
 * Handles database operations for the orders table
 */
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Create a new order in the database
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} - Created order
 */
async function createOrder(orderData) {
  try {
    logger.info('Creating new order with data', { orderData });
    
    // Generate a unique order ID if not provided
    if (!orderData.order_id) {
      orderData.order_id = `order_${uuidv4().replace(/-/g, '')}`;
      logger.info('Generated order ID', { orderId: orderData.order_id });
    }
    
    const query = `
      INSERT INTO orders (
        order_id,
        user_id,
        amount,
        currency,
        status,
        gateway,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      orderData.order_id,
      orderData.user_id,
      orderData.amount,
      orderData.currency || 'INR',
      orderData.status || 'created',
      orderData.gateway,
      orderData.metadata ? JSON.stringify(orderData.metadata) : null
    ];
    
    logger.info('Executing createOrder query', { 
      query, 
      params: { ...params, metadata: orderData.metadata } 
    });
    
    const result = await db.query(query, params);
    logger.info('Raw database response from createOrder', {
      response: result,
      responseType: typeof result,
      insertId: result?.insertId
    });
    
    const createdOrder = {
      id: result.insertId,
      ...orderData
    };
    
    logger.info('Order created successfully', { 
      orderId: orderData.order_id,
      createdOrder
    });
    
    return createdOrder;
  } catch (error) {
    logger.error('Error creating order', { 
      error: error.message,
      stack: error.stack,
      orderData 
    });
    throw error;
  }
}

/**
 * Get an order by its order_id
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} - Order object or null if not found
 */
async function getOrderByOrderId(orderId) {
  try {
    logger.info('Getting order by order ID', { orderId });
    
    const query = `
      SELECT * FROM orders WHERE order_id = ?
    `;
    logger.info('Executing getOrderByOrderId query', { query, orderId });
    
    const rows = await db.query(query, [orderId]);
    logger.info('Raw database response from getOrderByOrderId', {
      response: rows,
      responseType: typeof rows,
      isArray: Array.isArray(rows),
      length: rows?.length
    });
    
    if (rows.length === 0) {
      logger.info('Order not found', { orderId });
      return null;
    }
    
    // Parse metadata JSON if exists
    const order = rows[0];
    let parsedMetadata = null;
    
    if (order.metadata) {
      try {
        parsedMetadata = JSON.parse(order.metadata);
        logger.debug('Successfully parsed order metadata', { 
          orderId,
          metadata: parsedMetadata 
        });
      } catch (jsonError) {
        logger.error('Error parsing order metadata', {
          error: jsonError.message,
          orderId,
          rawMetadata: order.metadata
        });
      }
    }
    
    const formattedOrder = {
      ...order,
      metadata: parsedMetadata
    };
    
    logger.info('Order found and formatted', { 
      orderId,
      formattedOrder 
    });
    return formattedOrder;
  } catch (error) {
    logger.error('Error getting order by order ID', { 
      error: error.message,
      stack: error.stack,
      orderId 
    });
    throw error;
  }
}

/**
 * Get orders by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of orders
 */
async function getOrdersByUserId(userId) {
  try {
    logger.info('Getting orders by user ID', { userId });
    
    const query = `
      SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    `;
    logger.info('Executing getOrdersByUserId query', { query, userId });
    
    const rows = await db.query(query, [userId]);
    logger.info('Raw database response from getOrdersByUserId', {
      response: rows,
      responseType: typeof rows,
      isArray: Array.isArray(rows),
      length: rows?.length
    });
    
    // Parse metadata JSON if exists
    const orders = rows.map(order => {
      let parsedMetadata = null;
      if (order.metadata) {
        try {
          parsedMetadata = JSON.parse(order.metadata);
          logger.debug('Successfully parsed order metadata', {
            orderId: order.order_id,
            metadata: parsedMetadata
          });
        } catch (jsonError) {
          logger.error('Error parsing order metadata', {
            error: jsonError.message,
            orderId: order.order_id,
            rawMetadata: order.metadata
          });
        }
      }
      return {
        ...order,
        metadata: parsedMetadata
      };
    });
    
    logger.info('Orders retrieved and formatted', { 
      userId, 
      count: orders.length,
      orderIds: orders.map(o => o.order_id)
    });
    return orders;
  } catch (error) {
    logger.error('Error getting orders by user ID', { 
      error: error.message,
      stack: error.stack,
      userId 
    });
    throw error;
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<boolean>} - Success status
 */
async function updateOrderStatus(orderId, status) {
  try {
    logger.info('Updating order status', { orderId, status });
    
    const query = `
      UPDATE orders SET status = ? WHERE order_id = ?
    `;
    
    const result = await db.query(query, [status, orderId]);
    
    const success = result.affectedRows > 0;
    logger.info('Order status update result', { 
      orderId, 
      status, 
      success,
      affectedRows: result.affectedRows
    });
    
    return success;
  } catch (error) {
    logger.error('Error updating order status', { error: error.message, orderId, status });
    throw error;
  }
}

/**
 * Update order details
 * @param {string} orderId - Order ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<boolean>} - Success status
 */
async function updateOrder(orderId, updateData) {
  try {
    logger.info('Updating order', { orderId, updateData });
    
    if (Object.keys(updateData).length === 0) {
      logger.warn('No update data provided', { orderId });
      return false;
    }
    
    // Build dynamic update query
    const updateFields = [];
    const params = [];
    
    // Handle special case for metadata which needs to be JSON stringified
    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'metadata' && value !== null) {
        updateFields.push(`${key} = ?`);
        params.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    params.push(orderId);
    
    const query = `
      UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = ?
    `;
    
    const result = await db.query(query, params);
    
    const success = result.affectedRows > 0;
    logger.info('Order update result', { 
      orderId, 
      success,
      affectedRows: result.affectedRows
    });
    
    return success;
  } catch (error) {
    logger.error('Error updating order', { error: error.message, orderId, updateData });
    throw error;
  }
}

module.exports = {
  createOrder,
  getOrderByOrderId,
  getOrdersByUserId,
  updateOrderStatus,
  updateOrder
}; 