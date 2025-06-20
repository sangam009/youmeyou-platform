const RazorpayGateway = require('../../../src/services/gateways/razorpay.gateway');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/utils/logger');

describe('RazorpayGateway', () => {
  let razorpayGateway;
  let mockClient;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock Razorpay client
    mockClient = {
      orders: {
        create: jest.fn(),
        fetch: jest.fn()
      },
      payments: {
        fetch: jest.fn(),
        refund: jest.fn()
      },
      subscriptions: {
        create: jest.fn(),
        fetch: jest.fn()
      }
    };

    // Create gateway instance
    razorpayGateway = new RazorpayGateway({
      key_id: 'test_key_id',
      key_secret: 'test_key_secret'
    });

    // Replace client with mock
    razorpayGateway.client = mockClient;
  });

  describe('createOrder', () => {
    const mockOrderData = {
      amount: 1000,
      currency: 'INR',
      description: 'Test Order'
    };

    const mockOrder = {
      id: 'order_123',
      amount: 1000,
      currency: 'INR',
      status: 'created'
    };

    it('creates order successfully', async () => {
      // Setup mock
      mockClient.orders.create.mockResolvedValue(mockOrder);

      // Call gateway
      const result = await razorpayGateway.createOrder(mockOrderData);

      // Verify result
      expect(result).toEqual({
        order_id: 'order_123',
        amount: 1000,
        currency: 'INR',
        status: 'created'
      });

      // Verify client call
      expect(mockClient.orders.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'INR',
        notes: {
          description: 'Test Order'
        }
      });
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.orders.create.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.createOrder(mockOrderData)).rejects.toThrow(
        'Failed to create Razorpay order'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating Razorpay order:',
        expect.any(Error)
      );
    });
  });

  describe('verifyPayment', () => {
    const mockPaymentData = {
      payment_id: 'payment_123',
      order_id: 'order_123',
      signature: 'valid_signature'
    };

    const mockPayment = {
      id: 'payment_123',
      order_id: 'order_123',
      status: 'captured'
    };

    it('verifies payment successfully', async () => {
      // Setup mock
      mockClient.payments.fetch.mockResolvedValue(mockPayment);

      // Call gateway
      const result = await razorpayGateway.verifyPayment(mockPaymentData);

      // Verify result
      expect(result).toEqual({
        payment_id: 'payment_123',
        order_id: 'order_123',
        status: 'completed'
      });

      // Verify client call
      expect(mockClient.payments.fetch).toHaveBeenCalledWith('payment_123');
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.payments.fetch.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.verifyPayment(mockPaymentData)).rejects.toThrow(
        'Failed to verify Razorpay payment'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error verifying Razorpay payment:',
        expect.any(Error)
      );
    });
  });

  describe('getPaymentStatus', () => {
    const mockPaymentId = 'payment_123';
    const mockPayment = {
      id: 'payment_123',
      status: 'captured'
    };

    it('gets payment status successfully', async () => {
      // Setup mock
      mockClient.payments.fetch.mockResolvedValue(mockPayment);

      // Call gateway
      const result = await razorpayGateway.getPaymentStatus(mockPaymentId);

      // Verify result
      expect(result).toEqual({
        payment_id: 'payment_123',
        status: 'completed'
      });

      // Verify client call
      expect(mockClient.payments.fetch).toHaveBeenCalledWith('payment_123');
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.payments.fetch.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.getPaymentStatus(mockPaymentId)).rejects.toThrow(
        'Failed to get Razorpay payment status'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting Razorpay payment status:',
        expect.any(Error)
      );
    });
  });

  describe('createSubscription', () => {
    const mockSubscriptionData = {
      plan_id: 'plan_123',
      description: 'Test Subscription'
    };

    const mockSubscription = {
      id: 'sub_123',
      plan_id: 'plan_123',
      status: 'created'
    };

    it('creates subscription successfully', async () => {
      // Setup mock
      mockClient.subscriptions.create.mockResolvedValue(mockSubscription);

      // Call gateway
      const result = await razorpayGateway.createSubscription(mockSubscriptionData);

      // Verify result
      expect(result).toEqual({
        subscription_id: 'sub_123',
        plan_id: 'plan_123',
        status: 'created'
      });

      // Verify client call
      expect(mockClient.subscriptions.create).toHaveBeenCalledWith({
        plan_id: 'plan_123',
        notes: {
          description: 'Test Subscription'
        }
      });
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.subscriptions.create.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.createSubscription(mockSubscriptionData)).rejects.toThrow(
        'Failed to create Razorpay subscription'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating Razorpay subscription:',
        expect.any(Error)
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    const mockSubscriptionId = 'sub_123';
    const mockSubscription = {
      id: 'sub_123',
      status: 'active'
    };

    it('gets subscription status successfully', async () => {
      // Setup mock
      mockClient.subscriptions.fetch.mockResolvedValue(mockSubscription);

      // Call gateway
      const result = await razorpayGateway.getSubscriptionStatus(mockSubscriptionId);

      // Verify result
      expect(result).toEqual({
        subscription_id: 'sub_123',
        status: 'active'
      });

      // Verify client call
      expect(mockClient.subscriptions.fetch).toHaveBeenCalledWith('sub_123');
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.subscriptions.fetch.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.getSubscriptionStatus(mockSubscriptionId)).rejects.toThrow(
        'Failed to get Razorpay subscription status'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting Razorpay subscription status:',
        expect.any(Error)
      );
    });
  });

  describe('initiateRefund', () => {
    const mockRefundData = {
      payment_id: 'payment_123',
      amount: 1000,
      reason: 'Customer request'
    };

    const mockRefund = {
      id: 'refund_123',
      payment_id: 'payment_123',
      amount: 1000,
      status: 'processed'
    };

    it('initiates refund successfully', async () => {
      // Setup mock
      mockClient.payments.refund.mockResolvedValue(mockRefund);

      // Call gateway
      const result = await razorpayGateway.initiateRefund(mockRefundData);

      // Verify result
      expect(result).toEqual({
        refund_id: 'refund_123',
        payment_id: 'payment_123',
        amount: 1000,
        status: 'completed'
      });

      // Verify client call
      expect(mockClient.payments.refund).toHaveBeenCalledWith('payment_123', {
        amount: 1000,
        notes: {
          reason: 'Customer request'
        }
      });
    });

    it('handles client errors', async () => {
      // Setup mock error
      const error = new Error('Client error');
      mockClient.payments.refund.mockRejectedValue(error);

      // Call gateway
      await expect(razorpayGateway.initiateRefund(mockRefundData)).rejects.toThrow(
        'Failed to initiate Razorpay refund'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error initiating Razorpay refund:',
        expect.any(Error)
      );
    });
  });
}); 