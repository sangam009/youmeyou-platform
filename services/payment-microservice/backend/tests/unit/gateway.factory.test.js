const { expect } = require('chai');
const sinon = require('sinon');
const GatewayFactory = require('../../src/services/gateway.factory.js');
const config = require('../../src/config/payment-config');

describe('Gateway Factory', () => {
  let configStub;

  beforeEach(() => {
    configStub = sinon.stub(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getGateway', () => {
    it('should return Razorpay gateway instance', () => {
      const gatewayConfig = {
        key_id: 'test_key',
        key_secret: 'test_secret'
      };

      configStub.getGatewayConfig.returns(gatewayConfig);

      const gateway = GatewayFactory.getGateway('razorpay');
      expect(gateway).to.be.an('object');
      expect(gateway.constructor.name).to.equal('RazorpayGateway');
    });

    it('should return PhonePe gateway instance', () => {
      const gatewayConfig = {
        merchant_id: 'test_merchant',
        salt_key: 'test_salt',
        salt_index: '1'
      };

      configStub.getGatewayConfig.returns(gatewayConfig);

      const gateway = GatewayFactory.getGateway('phonepe');
      expect(gateway).to.be.an('object');
      expect(gateway.constructor.name).to.equal('PhonePeGateway');
    });

    it('should return Cashfree gateway instance', () => {
      const gatewayConfig = {
        app_id: 'test_app',
        secret_key: 'test_secret'
      };

      configStub.getGatewayConfig.returns(gatewayConfig);

      const gateway = GatewayFactory.getGateway('cashfree');
      expect(gateway).to.be.an('object');
      expect(gateway.constructor.name).to.equal('CashfreeGateway');
    });

    it('should throw error for unsupported gateway', () => {
      configStub.getGatewayConfig.returns({});

      expect(() => {
        GatewayFactory.getGateway('unsupported');
      }).to.throw('Unsupported gateway: unsupported');
    });

    it('should throw error when gateway config is not found', () => {
      configStub.getGatewayConfig.returns(null);

      expect(() => {
        GatewayFactory.getGateway('razorpay');
      }).to.throw('Gateway configuration not found for: razorpay');
    });
  });

  describe('getDefaultGateway', () => {
    it('should return default gateway instance', () => {
      const gatewayConfig = {
        key_id: 'test_key',
        key_secret: 'test_secret'
      };

      configStub.getDefaultGateway.returns('razorpay');
      configStub.getGatewayConfig.returns(gatewayConfig);

      const gateway = GatewayFactory.getDefaultGateway();
      expect(gateway).to.be.an('object');
      expect(gateway.constructor.name).to.equal('RazorpayGateway');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported gateways', () => {
      expect(GatewayFactory.isSupported('razorpay')).to.be.true;
      expect(GatewayFactory.isSupported('phonepe')).to.be.true;
      expect(GatewayFactory.isSupported('cashfree')).to.be.true;
    });

    it('should return false for unsupported gateways', () => {
      expect(GatewayFactory.isSupported('unsupported')).to.be.false;
      expect(GatewayFactory.isSupported('stripe')).to.be.false;
    });

    it('should be case insensitive', () => {
      expect(GatewayFactory.isSupported('RAZORPAY')).to.be.true;
      expect(GatewayFactory.isSupported('PhonePe')).to.be.true;
      expect(GatewayFactory.isSupported('CashFree')).to.be.true;
    });
  });
}); 