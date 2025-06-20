const RefundService = require('../../../src/services/refund.service');
const RefundModel = require('../../../src/models/refund.model');
const PaymentModel = require('../../../src/models/payment.model');
const GatewayFactory = require('../../../src/services/gateways/gateway.factory');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/models/refund.model');
jest.mock('../../../src/models/payment.model');
jest.mock('../../../src/services/gateways/gateway.factory');
jest.mock('../../../src/utils/logger');

describe('RefundService', () => {
  let refundService;
  let mockGateway;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock gateway
    mockGateway = {
      initiateRefund: jest.fn()
    };

    // Setup gateway factory mock
    GatewayFactory.getGateway.mockReturnValue(mockGateway);

    // Create service instance
    refundService = new RefundService();
  });

  describe('initiateRefund', () => {
    const mockRefundData = {
      payment_id: 'payment_123',
      amount: 1000,
      reason: 'Customer request'
    };

    const mockPayment = {
      id: 'payment_123',
      order_id: 'order_123',
      amount: 1000,
      currency: 'INR',
      status: 'completed',
      gateway: 'razorpay'
    };

    const mockRefund = {
      id: 'refund_123',
      payment_id: 'payment_123',
      amount: 1000,
      status: 'pending'
    };

    it('initiates refund successfully', async () => {
      // Setup mocks
      PaymentModel.getPaymentById.mockResolvedValue(mockPayment);
      mockGateway.initiateRefund.mockResolvedValue({
        refund_id: 'refund_123',
        status: 'pending'
      });
      RefundModel.createRefund.mockResolvedValue(mockRefund);
      PaymentModel.updatePaymentStatus.mockResolvedValue({
        ...mockPayment,
        status: 'refunding'
      });

      // Call service
      const result = await refundService.initiateRefund(mockRefundData, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'success',
        data: mockRefund
      });

      // Verify gateway call
      expect(mockGateway.initiateRefund).toHaveBeenCalledWith({
        payment_id: 'payment_123',
        amount: 1000,
        reason: 'Customer request'
      });

      // Verify refund creation
      expect(RefundModel.createRefund).toHaveBeenCalledWith({
        payment_id: 'payment_123',
        amount: 1000,
        reason: 'Customer request',
        user_id: 'user_123',
        gateway: 'razorpay',
        status: 'pending'
      });

      // Verify payment update
      expect(PaymentModel.updatePaymentStatus).toHaveBeenCalledWith(
        'payment_123',
        'refunding'
      );
    });

    it('handles non-existent payment', async () => {
      // Setup mocks
      PaymentModel.getPaymentById.mockResolvedValue(null);

      // Call service
      const result = await refundService.initiateRefund(mockRefundData, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Payment not found'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error initiating refund:',
        expect.any(Error)
      );
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      PaymentModel.getPaymentById.mockResolvedValue(mockPayment);
      const error = new Error('Gateway error');
      mockGateway.initiateRefund.mockRejectedValue(error);

      // Call service
      const result = await refundService.initiateRefund(mockRefundData, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to initiate refund'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error initiating refund:',
        expect.any(Error)
      );
    });
  });

  describe('getRefundDetails', () => {
    const mockRefundId = 'refund_123';
    const mockRefund = {
      id: 'refund_123',
      payment_id: 'payment_123',
      amount: 1000,
      status: 'completed'
    };

    it('gets refund details successfully', async () => {
      // Setup mocks
      RefundModel.getRefundById.mockResolvedValue(mockRefund);

      // Call service
      const result = await refundService.getRefundDetails(mockRefundId, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'success',
        data: mockRefund
      });

      // Verify refund retrieval
      expect(RefundModel.getRefundById).toHaveBeenCalledWith(mockRefundId);
    });

    it('handles non-existent refund', async () => {
      // Setup mocks
      RefundModel.getRefundById.mockResolvedValue(null);

      // Call service
      const result = await refundService.getRefundDetails(mockRefundId, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Refund not found'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting refund details:',
        expect.any(Error)
      );
    });
  });

  describe('getPaymentRefunds', () => {
    const mockPaymentId = 'payment_123';
    const mockRefunds = [
      {
        id: 'refund_123',
        payment_id: 'payment_123',
        amount: 1000,
        status: 'completed'
      }
    ];

    it('gets payment refunds successfully', async () => {
      // Setup mocks
      RefundModel.getRefundsByPaymentId.mockResolvedValue(mockRefunds);

      // Call service
      const result = await refundService.getPaymentRefunds(mockPaymentId, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'success',
        data: mockRefunds
      });

      // Verify refunds retrieval
      expect(RefundModel.getRefundsByPaymentId).toHaveBeenCalledWith(mockPaymentId);
    });

    it('handles no refunds found', async () => {
      // Setup mocks
      RefundModel.getRefundsByPaymentId.mockResolvedValue([]);

      // Call service
      const result = await refundService.getPaymentRefunds(mockPaymentId, 'user_123');

      // Verify result
      expect(result).toEqual({
        status: 'success',
        data: []
      });
    });
  });

  describe('processRefundWebhook', () => {
    const mockEvent = {
      type: 'refund.completed',
      payload: {
        refund_id: 'refund_123',
        payment_id: 'payment_123',
        status: 'completed'
      }
    };

    const mockRefund = {
      id: 'refund_123',
      payment_id: 'payment_123',
      amount: 1000,
      status: 'pending'
    };

    it('processes refund webhook successfully', async () => {
      // Setup mocks
      RefundModel.getRefundById.mockResolvedValue(mockRefund);
      RefundModel.updateRefundStatus.mockResolvedValue({
        ...mockRefund,
        status: 'completed'
      });
      PaymentModel.updatePaymentStatus.mockResolvedValue({
        id: 'payment_123',
        status: 'refunded'
      });

      // Call service
      const result = await refundService.processRefundWebhook(mockEvent);

      // Verify result
      expect(result).toEqual({
        status: 'success',
        data: {
          ...mockRefund,
          status: 'completed'
        }
      });

      // Verify refund update
      expect(RefundModel.updateRefundStatus).toHaveBeenCalledWith(
        'refund_123',
        'completed',
        {
          gateway_response: mockEvent.payload
        }
      );

      // Verify payment update
      expect(PaymentModel.updatePaymentStatus).toHaveBeenCalledWith(
        'payment_123',
        'refunded'
      );
    });

    it('handles non-existent refund', async () => {
      // Setup mocks
      RefundModel.getRefundById.mockResolvedValue(null);

      // Call service
      const result = await refundService.processRefundWebhook(mockEvent);

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Refund not found'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing refund webhook:',
        expect.any(Error)
      );
    });
  });
}); 