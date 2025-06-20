const RefundModel = require('../../../src/models/refund.model');
const db = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/logger');

describe('RefundModel', () => {
  let refundModel;
  let mockQuery;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock query
    mockQuery = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      then: jest.fn()
    };

    // Setup database mock
    db.mockReturnValue(mockQuery);

    // Create model instance
    refundModel = new RefundModel();
  });

  describe('createRefund', () => {
    const mockRefundData = {
      payment_id: 'payment_123',
      amount: 1000,
      reason: 'Customer request',
      user_id: 'user_123',
      gateway: 'razorpay',
      status: 'pending'
    };

    const mockRefund = {
      id: 'refund_123',
      ...mockRefundData
    };

    it('creates refund successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([mockRefund]);

      // Call model
      const result = await refundModel.createRefund(mockRefundData);

      // Verify result
      expect(result).toEqual(mockRefund);

      // Verify query
      expect(mockQuery.insert).toHaveBeenCalledWith(mockRefundData);
      expect(mockQuery.from).toHaveBeenCalledWith('refunds');
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(refundModel.createRefund(mockRefundData)).rejects.toThrow(
        'Failed to create refund'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating refund:',
        expect.any(Error)
      );
    });
  });

  describe('getRefundById', () => {
    const mockRefundId = 'refund_123';
    const mockRefund = {
      id: 'refund_123',
      payment_id: 'payment_123',
      status: 'completed',
      order_id: 'order_123',
      transaction_id: 'txn_123'
    };

    it('gets refund successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([mockRefund]);

      // Call model
      const result = await refundModel.getRefundById(mockRefundId);

      // Verify result
      expect(result).toEqual(mockRefund);

      // Verify query
      expect(mockQuery.select).toHaveBeenCalledWith([
        'refunds.*',
        'payments.order_id',
        'payments.transaction_id'
      ]);
      expect(mockQuery.from).toHaveBeenCalledWith('refunds');
      expect(mockQuery.where).toHaveBeenCalledWith('refunds.id', mockRefundId);
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('handles non-existent refund', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([]);

      // Call model
      const result = await refundModel.getRefundById(mockRefundId);

      // Verify result
      expect(result).toBeNull();
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(refundModel.getRefundById(mockRefundId)).rejects.toThrow(
        'Failed to get refund'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting refund:',
        expect.any(Error)
      );
    });
  });

  describe('updateRefundStatus', () => {
    const mockRefundId = 'refund_123';
    const mockStatus = 'completed';
    const mockAdditionalData = {
      gateway_refund_id: 'rzp_refund_123',
      gateway_response: { status: 'success' }
    };

    it('updates refund status successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([{ id: mockRefundId, status: mockStatus }]);

      // Call model
      const result = await refundModel.updateRefundStatus(mockRefundId, mockStatus, mockAdditionalData);

      // Verify result
      expect(result).toEqual({ id: mockRefundId, status: mockStatus });

      // Verify query
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: mockStatus,
        gateway_refund_id: mockAdditionalData.gateway_refund_id,
        gateway_response: JSON.stringify(mockAdditionalData.gateway_response)
      });
      expect(mockQuery.from).toHaveBeenCalledWith('refunds');
      expect(mockQuery.where).toHaveBeenCalledWith('id', mockRefundId);
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(refundModel.updateRefundStatus(mockRefundId, mockStatus, mockAdditionalData)).rejects.toThrow(
        'Failed to update refund status'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating refund status:',
        expect.any(Error)
      );
    });
  });

  describe('getRefundsByPaymentId', () => {
    const mockPaymentId = 'payment_123';
    const mockRefunds = [
      { id: 'refund_123', payment_id: mockPaymentId },
      { id: 'refund_456', payment_id: mockPaymentId }
    ];

    it('gets refunds successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue(mockRefunds);

      // Call model
      const result = await refundModel.getRefundsByPaymentId(mockPaymentId);

      // Verify result
      expect(result).toEqual(mockRefunds);

      // Verify query
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.from).toHaveBeenCalledWith('refunds');
      expect(mockQuery.where).toHaveBeenCalledWith('payment_id', mockPaymentId);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(refundModel.getRefundsByPaymentId(mockPaymentId)).rejects.toThrow(
        'Failed to get refunds'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting refunds:',
        expect.any(Error)
      );
    });
  });

  describe('getUserRefunds', () => {
    const mockUserId = 'user_123';
    const mockRefunds = [
      { id: 'refund_123', user_id: mockUserId },
      { id: 'refund_456', user_id: mockUserId }
    ];

    it('gets user refunds successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue(mockRefunds);

      // Call model
      const result = await refundModel.getUserRefunds(mockUserId, 10, 0);

      // Verify result
      expect(result).toEqual(mockRefunds);

      // Verify query
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.from).toHaveBeenCalledWith('refunds');
      expect(mockQuery.where).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(refundModel.getUserRefunds(mockUserId, 10, 0)).rejects.toThrow(
        'Failed to get user refunds'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting user refunds:',
        expect.any(Error)
      );
    });
  });
}); 