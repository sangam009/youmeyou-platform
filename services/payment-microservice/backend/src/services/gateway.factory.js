const RazorpayGateway = require('./gateways/razorpay.gateway');
const PhonePeGateway = require('./gateways/phonepe.gateway');
const CashfreeGateway = require('./gateways/cashfree.gateway');
const config = require('../config/payment-config');

/**
 * Factory class for creating payment gateway instances
 */
class GatewayFactory {
  /**
   * Get a payment gateway instance
   * @param {string} gatewayName - Name of the gateway
   * @returns {PaymentGateway} - Gateway instance
   */
  static getGateway(gatewayName) {
    const gatewayConfig = config.getGateway(gatewayName);
    
    if (!gatewayConfig) {
      throw new Error(`Gateway configuration not found for: ${gatewayName}`);
    }

    if (!config.isGatewayEnabled(gatewayName)) {
      throw new Error(`Gateway ${gatewayName} is not enabled`);
    }

    switch (gatewayName.toLowerCase()) {
      case 'razorpay':
        return new RazorpayGateway(gatewayConfig);
      case 'phonepe':
        return new PhonePeGateway(gatewayConfig);
      case 'cashfree':
        return new CashfreeGateway(gatewayConfig);
      default:
        throw new Error(`Unsupported gateway: ${gatewayName}`);
    }
  }

  /**
   * Get the default payment gateway
   * @returns {PaymentGateway} - Default gateway instance
   */
  static getDefaultGateway() {
    const defaultGateway = config.defaultGateway;
    return this.getGateway(defaultGateway);
  }

  /**
   * Check if a gateway is supported
   * @param {string} gatewayName - Name of the gateway
   * @returns {boolean} - Whether the gateway is supported
   */
  static isSupported(gatewayName) {
    const supportedGateways = ['razorpay', 'phonepe', 'cashfree'];
    return supportedGateways.includes(gatewayName.toLowerCase());
  }
}

module.exports = GatewayFactory; 