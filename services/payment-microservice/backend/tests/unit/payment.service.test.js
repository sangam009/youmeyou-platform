const PaymentService = require('../../../src/services/payment.service');
const PaymentModel = require('../../../src/models/payment.model');
const GatewayFactory = require('../../../src/services/gateways/gateway.factory');
const logger = require('../../../src/utils/logger');
const firebase = require('../../../src/config/firebase');

// Mock dependencies
jest.mock('../../../src/models/payment.model');
jest.mock('../../../src/services/gateways/gateway.factory');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config/firebase');

describe('PaymentService', () => {
  let paymentService;
  let mockPaymentGateway;
  let mockPaymentModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock payment gateway
    mockPaymentGateway = {
      createOrder: jest.fn(),
      verifyPayment: jest.fn(),
      getPaymentStatus: jest.fn()
    };

    // Setup mock model
    mockPaymentModel = {
      createPayment: jest.fn(),
      getPaymentById: jest.fn(),
      updatePaymentStatus: jest.fn(),
      updatePaymentOrder: jest.fn()
    };

    // Setup mocks
    PaymentModel.mockImplementation(() => mockPaymentModel);
    GatewayFactory.getGateway.mockReturnValue(mockPaymentGateway);

    // Create service instance
    paymentService = new PaymentService();
  });

  describe('createOrder', () => {
    const mockOrderData = {
      amount: 1000,
      currency: 'INR',
      user_id: 'user_123'
    };

    const mockOrder = {
      id: 'order_123',
      amount: 1000,
      currency: 'INR'
    };

    it('creates order successfully', async () => {
      // Setup mocks
      mockPaymentGateway.createOrder.mockResolvedValue({
        status: 'success',
        order: mockOrder
      });

      mockPaymentModel.createPayment.mockResolvedValue({
        id: 'payment_123',
        order_id: mockOrder.id,
        status: 'pending'
      });

      // Call service
      const result = await paymentService.createOrder(mockOrderData);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        order: mockOrder,
        payment: {
          id: 'payment_123',
          order_id: mockOrder.id,
          status: 'pending'
        }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.createOrder).toHaveBeenCalledWith(mockOrderData);

      // Verify model calls
      expect(mockPaymentModel.createPayment).toHaveBeenCalledWith({
        order_id: mockOrder.id,
        amount: mockOrder.amount,
        currency: mockOrder.currency,
        user_id: mockOrderData.user_id,
        status: 'pending',
        gateway: 'razorpay'
      });
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.createOrder.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await paymentService.createOrder(mockOrderData);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to create order'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating order:',
        expect.any(Error)
      );
    });
  });

  describe('verifyPayment', () => {
    const mockPaymentId = 'payment_123';
    const mockSignature = 'valid_signature';
    const mockPaymentData = {
      razorpay_payment_id: 'rzp_payment_123',
      razorpay_order_id: 'rzp_order_123',
      razorpay_signature: mockSignature
    };

    it('verifies payment successfully', async () => {
      // Setup mocks
      mockPaymentGateway.verifyPayment.mockResolvedValue({
        status: 'success',
        payment: {
          id: mockPaymentId,
          status: 'captured'
        }
      });

      mockPaymentModel.getPaymentById.mockResolvedValue({
        id: mockPaymentId,
        status: 'pending'
      });

      mockPaymentModel.updatePaymentStatus.mockResolvedValue({
        id: mockPaymentId,
        status: 'captured'
      });

      // Call service
      const result = await paymentService.verifyPayment(
        mockPaymentId,
        mockPaymentData
      );

      // Verify result
      expect(result).toEqual({
        status: 'success',
        payment: {
          id: mockPaymentId,
          status: 'captured'
        }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.verifyPayment).toHaveBeenCalledWith(
        mockPaymentData
      );

      // Verify model calls
      expect(mockPaymentModel.getPaymentById).toHaveBeenCalledWith(mockPaymentId);
      expect(mockPaymentModel.updatePaymentStatus).toHaveBeenCalledWith(
        mockPaymentId,
        'captured'
      );
    });

    it('handles invalid signature', async () => {
      // Setup mocks
      mockPaymentGateway.verifyPayment.mockResolvedValue({
        status: 'error',
        message: 'Invalid signature'
      });

      // Call service
      const result = await paymentService.verifyPayment(
        mockPaymentId,
        mockPaymentData
      );

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Invalid signature'
      });

      // Verify model calls
      expect(mockPaymentModel.updatePaymentStatus).toHaveBeenCalledWith(
        mockPaymentId,
        'failed'
      );
    });

    it('handles non-existent payment', async () => {
      // Setup mocks
      mockPaymentModel.getPaymentById.mockResolvedValue(null);

      // Call service
      const result = await paymentService.verifyPayment(
        mockPaymentId,
        mockPaymentData
      );

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Payment not found'
      });
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.verifyPayment.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await paymentService.verifyPayment(
        mockPaymentId,
        mockPaymentData
      );

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to verify payment'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error verifying payment:',
        expect.any(Error)
      );
    });
  });

  describe('getPaymentStatus', () => {
    const mockPaymentId = 'payment_123';

    it('gets payment status successfully', async () => {
      // Setup mocks
      mockPaymentModel.getPaymentById.mockResolvedValue({
        id: mockPaymentId,
        status: 'captured'
      });

      // Call service
      const result = await paymentService.getPaymentStatus(mockPaymentId);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        payment: {
          id: mockPaymentId,
          status: 'captured'
        }
      });

      // Verify model calls
      expect(mockPaymentModel.getPaymentById).toHaveBeenCalledWith(mockPaymentId);
    });

    it('handles non-existent payment', async () => {
      // Setup mocks
      mockPaymentModel.getPaymentById.mockResolvedValue(null);

      // Call service
      const result = await paymentService.getPaymentStatus(mockPaymentId);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Payment not found'
      });
    });

    it('handles database errors', async () => {
      // Setup mocks
      mockPaymentModel.getPaymentById.mockRejectedValue(
        new Error('Database error')
      );

      // Call service
      const result = await paymentService.getPaymentStatus(mockPaymentId);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to get payment status'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting payment status:',
        expect.any(Error)
      );
    });
  });

  describe('broadcastPaymentEvent', () => {
    const mockPayment = {
      id: 'payment_123',
      status: 'captured',
      user_id: 'user_123'
    };

    it('broadcasts payment event successfully', async () => {
      // Setup mocks
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockResolvedValue()
      });

      // Call service
      await paymentService.broadcastPaymentEvent(mockPayment);

      // Verify Firebase calls
      expect(firebase.database().ref().child).toHaveBeenCalledWith(
        `payments/${mockPayment.user_id}/${mockPayment.id}`
      );
    });

    it('handles Firebase errors', async () => {
      // Setup mocks
      const error = new Error('Firebase error');
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockRejectedValue(error)
      });

      // Call service
      await paymentService.broadcastPaymentEvent(mockPayment);

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error broadcasting payment event:',
        expect.any(Error)
      );
    });
  });
}); 