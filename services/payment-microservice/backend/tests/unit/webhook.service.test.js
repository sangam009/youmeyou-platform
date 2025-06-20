const WebhookService = require('../../../src/services/webhook.service');
const PaymentModel = require('../../../src/models/payment.model');
const RefundModel = require('../../../src/models/refund.model');
const GatewayFactory = require('../../../src/services/gateways/gateway.factory');
const logger = require('../../../src/utils/logger');
const firebase = require('../../../src/config/firebase');

// Mock dependencies
jest.mock('../../../src/models/payment.model');
jest.mock('../../../src/models/refund.model');
jest.mock('../../../src/services/gateways/gateway.factory');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config/firebase');

describe('WebhookService', () => {
  let webhookService;
  let mockPaymentGateway;
  let mockPaymentModel;
  let mockRefundModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock payment gateway
    mockPaymentGateway = {
      verifyWebhook: jest.fn(),
      processPaymentWebhook: jest.fn(),
      processRefundWebhook: jest.fn()
    };

    // Setup mock models
    mockPaymentModel = {
      getPaymentById: jest.fn(),
      updatePaymentStatus: jest.fn()
    };

    mockRefundModel = {
      getRefundById: jest.fn(),
      updateRefundStatus: jest.fn()
    };

    // Setup mocks
    PaymentModel.mockImplementation(() => mockPaymentModel);
    RefundModel.mockImplementation(() => mockRefundModel);
    GatewayFactory.getGateway.mockReturnValue(mockPaymentGateway);

    // Create service instance
    webhookService = new WebhookService();
  });

  describe('processWebhook', () => {
    const mockEvent = 'payment.captured';
    const mockPayload = {
      payment: {
        id: 'payment_123',
        status: 'captured'
      }
    };
    const mockSignature = 'valid_signature';
    const mockGateway = 'razorpay';

    it('processes payment webhook successfully', async () => {
      // Setup mocks
      mockPaymentGateway.verifyWebhook.mockResolvedValue(true);
      mockPaymentGateway.processPaymentWebhook.mockResolvedValue({
        status: 'success',
        payment: { id: 'payment_123', status: 'captured' }
      });

      // Call service
      const result = await webhookService.processWebhook(
        mockEvent,
        mockPayload,
        mockSignature,
        mockGateway
      );

      // Verify result
      expect(result).toEqual({
        status: 'success',
        payment: { id: 'payment_123', status: 'captured' }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.verifyWebhook).toHaveBeenCalledWith(
        mockPayload,
        mockSignature
      );
      expect(mockPaymentGateway.processPaymentWebhook).toHaveBeenCalledWith(
        mockEvent,
        mockPayload
      );
    });

    it('processes refund webhook successfully', async () => {
      // Setup mocks
      const refundEvent = 'refund.processed';
      const refundPayload = {
        refund: {
          id: 'refund_123',
          status: 'processed'
        }
      };

      mockPaymentGateway.verifyWebhook.mockResolvedValue(true);
      mockPaymentGateway.processRefundWebhook.mockResolvedValue({
        status: 'success',
        refund: { id: 'refund_123', status: 'processed' }
      });

      // Call service
      const result = await webhookService.processWebhook(
        refundEvent,
        refundPayload,
        mockSignature,
        mockGateway
      );

      // Verify result
      expect(result).toEqual({
        status: 'success',
        refund: { id: 'refund_123', status: 'processed' }
      });

      // Verify gateway calls
      expect(mockPaymentGateway.verifyWebhook).toHaveBeenCalledWith(
        refundPayload,
        mockSignature
      );
      expect(mockPaymentGateway.processRefundWebhook).toHaveBeenCalledWith(
        refundEvent,
        refundPayload
      );
    });

    it('handles invalid signature', async () => {
      // Setup mocks
      mockPaymentGateway.verifyWebhook.mockResolvedValue(false);

      // Call service
      const result = await webhookService.processWebhook(
        mockEvent,
        mockPayload,
        mockSignature,
        mockGateway
      );

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Invalid webhook signature'
      });

      // Verify gateway calls
      expect(mockPaymentGateway.verifyWebhook).toHaveBeenCalledWith(
        mockPayload,
        mockSignature
      );
      expect(mockPaymentGateway.processPaymentWebhook).not.toHaveBeenCalled();
    });

    it('handles gateway errors', async () => {
      // Setup mocks
      mockPaymentGateway.verifyWebhook.mockResolvedValue(true);
      mockPaymentGateway.processPaymentWebhook.mockRejectedValue(
        new Error('Gateway error')
      );

      // Call service
      const result = await webhookService.processWebhook(
        mockEvent,
        mockPayload,
        mockSignature,
        mockGateway
      );

      // Verify result
      expect(result).toEqual({
        status: 'error',
        message: 'Failed to process webhook'
      });

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing webhook:',
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
      await webhookService.broadcastPaymentEvent(mockPayment);

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
      await webhookService.broadcastPaymentEvent(mockPayment);

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error broadcasting payment event:',
        expect.any(Error)
      );
    });
  });

  describe('broadcastRefundEvent', () => {
    const mockRefund = {
      id: 'refund_123',
      status: 'processed',
      user_id: 'user_123'
    };

    it('broadcasts refund event successfully', async () => {
      // Setup mocks
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockResolvedValue()
      });

      // Call service
      await webhookService.broadcastRefundEvent(mockRefund);

      // Verify Firebase calls
      expect(firebase.database().ref().child).toHaveBeenCalledWith(
        `refunds/${mockRefund.user_id}/${mockRefund.id}`
      );
    });

    it('handles Firebase errors', async () => {
      // Setup mocks
      const error = new Error('Firebase error');
      firebase.database().ref().child.mockReturnValue({
        set: jest.fn().mockRejectedValue(error)
      });

      // Call service
      await webhookService.broadcastRefundEvent(mockRefund);

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error broadcasting refund event:',
        expect.any(Error)
      );
    });
  });
}); 