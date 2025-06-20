/**
 * Payment Configuration
 * Centralized configuration for payment settings and gateway selection
 */

const { getConfig, getNumericConfig, getBooleanConfig, getArrayConfig } = require('./config-loader');

const paymentConfig = {
  // Default gateway to use for all payments
  defaultGateway: getConfig('DEFAULT_PAYMENT_GATEWAY', 'razorpay'),
  
  // Supported payment methods
  supportedMethods: getArrayConfig('SUPPORTED_PAYMENT_METHODS', ['upi', 'card', 'netbanking', 'wallet']),
  
  // Supported currencies
  supportedCurrencies: getArrayConfig('SUPPORTED_CURRENCIES', ['INR', 'USD']),
  
  // Order expiry time in hours
  orderExpiryHours: getNumericConfig('PAYMENT_EXPIRY_HOURS', 24),
  
  // Payment status polling settings
  statusPolling: {
    // Interval in seconds between status checks
    intervalSeconds: getNumericConfig('STATUS_POLLING_INTERVAL', 5),
    // Maximum number of retries for status check
    maxRetries: getNumericConfig('STATUS_POLLING_MAX_RETRIES', 12),
  },
  
  // Transaction fee settings (used for price calculations)
  fees: {
    // Whether to pass on gateway fees to the customer
    passThroughToCustomer: getBooleanConfig('PASS_GATEWAY_FEES', false),
    // Default fee percentage
    defaultPercentage: getNumericConfig('DEFAULT_FEE_PERCENTAGE', 2.0),
    // Per-gateway fee overrides
    gateways: {
      razorpay: {
        card: getNumericConfig('RAZORPAY_CARD_FEE', 2.0),
        upi: getNumericConfig('RAZORPAY_UPI_FEE', 0.8),
        netbanking: getNumericConfig('RAZORPAY_NETBANKING_FEE', 1.5),
        wallet: getNumericConfig('RAZORPAY_WALLET_FEE', 1.8),
      }
    }
  },
  
  // Configuration for each supported gateway
  gateways: {
    razorpay: {
      name: 'Razorpay',
      enabled: getBooleanConfig('RAZORPAY_ENABLED', true),
      testMode: getConfig('NODE_ENV', 'development') !== 'production',
      credentials: {
        key_id: getConfig('RAZORPAY_KEY_ID', ''),
        key_secret: getConfig('RAZORPAY_KEY_SECRET', '')
      },
      settings: {
        upi: {
          defaultVpa: getConfig('UPI_DEFAULT_VPA', 'razorpay@razorpay'),
          merchantName: getConfig('UPI_MERCHANT_NAME', 'Payment Service')
        },
        webhookEnabled: getBooleanConfig('RAZORPAY_WEBHOOK_ENABLED', true),
        webhookSecret: getConfig('RAZORPAY_WEBHOOK_SECRET', ''),
        autoCapture: getBooleanConfig('RAZORPAY_AUTO_CAPTURE', true),
        retryFailedPayments: getBooleanConfig('RAZORPAY_RETRY_FAILED', false),
        sendPaymentEmail: getBooleanConfig('RAZORPAY_SEND_EMAIL', false),
        sendPaymentSms: getBooleanConfig('RAZORPAY_SEND_SMS', false),
        checkoutTheme: {
          color: getConfig('RAZORPAY_THEME_COLOR', '#3399cc'),
          logoUrl: getConfig('RAZORPAY_LOGO_URL', '')
        }
      },
      supportedFlows: {
        upi: ['intent', 'collect'],
        card: ['redirect', 'embedded'],
        netbanking: ['redirect'],
        wallet: ['redirect']
      }
    },
    phonepe: {
      enabled: getBooleanConfig('PHONEPE_ENABLED', false),
      credentials: {
        merchant_id: getConfig('PHONEPE_MERCHANT_ID', ''),
        salt_key: getConfig('PHONEPE_SALT_KEY', ''),
        salt_index: getConfig('PHONEPE_SALT_INDEX', ''),
        base_url: getConfig('PHONEPE_BASE_URL', 'https://api.phonepe.com/apis/hermes')
      }
    },
    cashfree: {
      enabled: getBooleanConfig('CASHFREE_ENABLED', false),
      credentials: {
        app_id: getConfig('CASHFREE_APP_ID', ''),
        secret_key: getConfig('CASHFREE_SECRET_KEY', ''),
        base_url: getConfig('CASHFREE_BASE_URL', 'https://api.cashfree.com/pg'),
        env: getConfig('CASHFREE_ENV', 'PRODUCTION')
      }
    }
  },
  
  // Get the active gateway configuration
  getActiveGateway() {
    return this.gateways[this.defaultGateway];
  },
  
  // Get gateway by name
  getGateway(gatewayName) {
    return this.gateways[gatewayName] || this.getActiveGateway();
  },
  
  // Check if a gateway is enabled
  isGatewayEnabled(gatewayName) {
    const gateway = this.gateways[gatewayName];
    return gateway && gateway.enabled === true;
  },
  
  // Check if a payment method is supported
  isMethodSupported(method) {
    return this.supportedMethods.includes(method);
  },
  
  // Check if a currency is supported
  isCurrencySupported(currency) {
    return this.supportedCurrencies.includes(currency);
  },
  
  // Get fee for a specific payment method and gateway
  getFeePercentage(gateway = this.defaultGateway, method = 'card') {
    if (this.fees.gateways[gateway] && this.fees.gateways[gateway][method]) {
      return this.fees.gateways[gateway][method];
    }
    return this.fees.defaultPercentage;
  },
  
  // Calculate fee amount for a payment
  calculateFee(amount, gateway = this.defaultGateway, method = 'card') {
    if (!this.fees.passThroughToCustomer) return 0;
    
    const feePercentage = this.getFeePercentage(gateway, method);
    return Math.round((amount * feePercentage) / 100);
  }
};

// Run validation on startup
(() => {
  // Check for critical configuration
  if (!paymentConfig.gateways.razorpay.credentials.key_id || 
      !paymentConfig.gateways.razorpay.credentials.key_secret) {
    console.warn('[WARN] Razorpay credentials not configured properly');
  }
  
  if (paymentConfig.gateways.razorpay.settings.webhookEnabled && 
      !paymentConfig.gateways.razorpay.settings.webhookSecret) {
    console.warn('[WARN] Razorpay webhook is enabled but webhook secret is not configured');
  }
  
  console.log(`[INFO] Payment configuration loaded: ${paymentConfig.defaultGateway} (Test Mode: ${paymentConfig.gateways[paymentConfig.defaultGateway].testMode})`);
})();

module.exports = paymentConfig; 