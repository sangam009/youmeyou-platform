/**
 * Health check controller
 * Returns the status of the payment service and its dependencies
 */

const healthCheck = (req, res) => {
  // In a more complex implementation, this would check database and
  // payment gateway connectivity as well
  
  res.status(200).json({
    status: 'success',
    message: 'Payment service is running',
    timestamp: new Date().toISOString(),
    service: 'payment-microservice'
  });
};

module.exports = {
  healthCheck
};