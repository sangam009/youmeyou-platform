const SubscriptionService = require('../../../src/services/subscription.service');
const PaymentModel = require('../../../src/models/payment.model');
const GatewayFactory = require('../../../src/services/gateways/gateway.factory');
const logger = require('../../../src/utils/logger');
const firebase = require('../../../src/config/firebase');

// Mock dependencies
jest.mock('../../../src/models/payment.model');
jest.mock('../../../src/services/gateways/gateway.factory');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config/firebase');

describe('SubscriptionService', () => {
  let subscriptionService;
  let mockPaymentGateway;
  let mockPaymentModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock payment gateway
    mockPaymentGateway = {
      createSubscription: jest.fn(),
      getSubscriptionStatus: jest.fn(),
      cancelSubscription: jest.fn()
    };

    // Setup mock model
    mockPaymentModel = {
      createPayment: jest.fn(),
      getPaymentById: jest.fn(),
      updatePaymentStatus: jest.fn()
    };

    // Setup mocks
    PaymentModel.mockImplementation(() => mockPaymentModel);
    GatewayFactory.getGateway.mockReturnValue(mockPaymentGateway);

    // Create service instance
    subscriptionService = new SubscriptionService();
  });

  describe('createSubscription', () => {
    const mockSubscriptionData = {
      plan_id: 'plan_123',
      user_id: 'user_123',
      amount: 1000,
      currency: 'INR'
    };

    const mockSubscription = {
      id: 'sub_123',
      plan_id: 'plan_123',
      status: 'active'
    };

    it('creates subscription successfully', async () => {
      // Setup mocks
      mockPaymentGateway.createSubscription.mockResolvedValue({
        status: 'success',
        subscription: mockSubscription
      });

      mockPaymentModel.createPayment.mockResolvedValue({
        id: 'payment_123',
        subscription_id: mockSubscription.id,
        status: 'pending'
      });

      // Call service
      const result = await subscriptionService.createSubscription(mockSubscriptionData);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        subscription: mockSubscription,
        payment: {
          id: 'payment_123',
          subscription_id: mockSubscription.id,
          status: 'pending'
        }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.createSubscription).toHaveBeenCalledWith(mockSubscriptionData);

      // Verify model calls
      expect(mockPaymentModel.createPayment).toHaveBeenCalledWith({
        subscription_id: mockSubscription.id,
        amount: mockSubscriptionData.amount,
        currency: mockSubscriptionData.currency,
        user_id: mockSubscriptionData.user_id,
        status: 'pending',
        gateway: 'razorpay'
      });
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.createSubscription.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await subscriptionService.createSubscription(mockSubscriptionData);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to create subscription'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating subscription:',
        expect.any(Error)
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    const mockSubscriptionId = 'sub_123';

    it('gets subscription status successfully', async () => {
      // Setup mocks
      mockPaymentGateway.getSubscriptionStatus.mockResolvedValue({
        status: 'success',
        subscription: {
          id: mockSubscriptionId,
          status: 'active'
        }
      });

      // Call service
      const result = await subscriptionService.getSubscriptionStatus(mockSubscriptionId);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        subscription: {
          id: mockSubscriptionId,
          status: 'active'
        }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.getSubscriptionStatus).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.getSubscriptionStatus.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await subscriptionService.getSubscriptionStatus(mockSubscriptionId);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to get subscription status'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting subscription status:',
        expect.any(Error)
      );
    });
  });

  describe('cancelSubscription', () => {
    const mockSubscriptionId = 'sub_123';

    it('cancels subscription successfully', async () => {
      // Setup mocks
      mockPaymentGateway.cancelSubscription.mockResolvedValue({
        status: 'success',
        subscription: {
          id: mockSubscriptionId,
          status: 'cancelled'
        }
      });

      // Call service
      const result = await subscriptionService.cancelSubscription(mockSubscriptionId);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        subscription: {
          id: mockSubscriptionId,
          status: 'cancelled'
        }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.cancelSubscription).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.cancelSubscription.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await subscriptionService.cancelSubscription(mockSubscriptionId);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to cancel subscription'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error cancelling subscription:',
        expect.any(Error)
      );
    });
  });

  describe('broadcastSubscriptionEvent', () => {
    const mockSubscription = {
      id: 'sub_123',
      status: 'active',
      user_id: 'user_123'
    };

    it('broadcasts subscription event successfully', async () => {
      // Setup mocks
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockResolvedValue()
      });

      // Call service
      await subscriptionService.broadcastSubscriptionEvent(mockSubscription);

      // Verify Firebase calls
      expect(firebase.database().ref().child).toHaveBeenCalledWith(
        `subscriptions/${mockSubscription.user_id}/${mockSubscription.id}`
      );
    });

    it('handles Firebase errors', async () => {
      // Setup mocks
      const error = new Error('Firebase error');
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockRejectedValue(error)
      });

      // Call service
      await subscriptionService.broadcastSubscriptionEvent(mockSubscription);

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error broadcasting subscription event:',
        expect.any(Error)
      );
    });
  });
}); 