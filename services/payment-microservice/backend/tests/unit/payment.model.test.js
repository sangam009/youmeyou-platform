const PaymentModel = require('../../../src/models/payment.model');
const db = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/logger');

describe('PaymentModel', () => {
  let paymentModel;
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
    paymentModel = new PaymentModel();
  });

  describe('createPayment', () => {
    const mockPaymentData = {
      order_id: 'order_123',
      amount: 1000,
      currency: 'INR',
      status: 'pending',
      gateway: 'razorpay'
    };

    const mockPayment = {
      id: 'payment_123',
      ...mockPaymentData
    };

    it('creates payment successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([mockPayment]);

      // Call model
      const result = await paymentModel.createPayment(mockPaymentData);

      // Verify result
      expect(result).toEqual(mockPayment);

      // Verify query
      expect(mockQuery.insert).toHaveBeenCalledWith(mockPaymentData);
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.createPayment(mockPaymentData)).rejects.toThrow(
        'Failed to create payment'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating payment:',
        expect.any(Error)
      );
    });
  });

  describe('getPaymentById', () => {
    const mockPaymentId = 'payment_123';
    const mockPayment = {
      id: 'payment_123',
      order_id: 'order_123',
      status: 'completed'
    };

    it('gets payment successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([mockPayment]);

      // Call model
      const result = await paymentModel.getPaymentById(mockPaymentId);

      // Verify result
      expect(result).toEqual(mockPayment);

      // Verify query
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
      expect(mockQuery.where).toHaveBeenCalledWith('id', mockPaymentId);
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('handles non-existent payment', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([]);

      // Call model
      const result = await paymentModel.getPaymentById(mockPaymentId);

      // Verify result
      expect(result).toBeNull();
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.getPaymentById(mockPaymentId)).rejects.toThrow(
        'Failed to get payment'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting payment:',
        expect.any(Error)
      );
    });
  });

  describe('updatePaymentStatus', () => {
    const mockPaymentId = 'payment_123';
    const mockStatus = 'completed';

    it('updates payment status successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([{ id: mockPaymentId, status: mockStatus }]);

      // Call model
      const result = await paymentModel.updatePaymentStatus(mockPaymentId, mockStatus);

      // Verify result
      expect(result).toEqual({ id: mockPaymentId, status: mockStatus });

      // Verify query
      expect(mockQuery.update).toHaveBeenCalledWith({ status: mockStatus });
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
      expect(mockQuery.where).toHaveBeenCalledWith('id', mockPaymentId);
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.updatePaymentStatus(mockPaymentId, mockStatus)).rejects.toThrow(
        'Failed to update payment status'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating payment status:',
        expect.any(Error)
      );
    });
  });

  describe('updatePaymentOrder', () => {
    const mockPaymentId = 'payment_123';
    const mockOrderId = 'order_456';

    it('updates payment order successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([{ id: mockPaymentId, order_id: mockOrderId }]);

      // Call model
      const result = await paymentModel.updatePaymentOrder(mockPaymentId, mockOrderId);

      // Verify result
      expect(result).toEqual({ id: mockPaymentId, order_id: mockOrderId });

      // Verify query
      expect(mockQuery.update).toHaveBeenCalledWith({ order_id: mockOrderId });
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
      expect(mockQuery.where).toHaveBeenCalledWith('id', mockPaymentId);
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.updatePaymentOrder(mockPaymentId, mockOrderId)).rejects.toThrow(
        'Failed to update payment order'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating payment order:',
        expect.any(Error)
      );
    });
  });

  describe('getExpiredPayments', () => {
    const mockExpiredPayments = [
      { id: 'payment_123', status: 'pending' },
      { id: 'payment_456', status: 'pending' }
    ];

    it('gets expired payments successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue(mockExpiredPayments);

      // Call model
      const result = await paymentModel.getExpiredPayments();

      // Verify result
      expect(result).toEqual(mockExpiredPayments);

      // Verify query
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'pending');
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<', expect.any(Date));
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.getExpiredPayments()).rejects.toThrow(
        'Failed to get expired payments'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting expired payments:',
        expect.any(Error)
      );
    });
  });

  describe('markExpiredPayments', () => {
    it('marks expired payments successfully', async () => {
      // Setup mock
      mockQuery.then.mockResolvedValue([{ count: 2 }]);

      // Call model
      const result = await paymentModel.markExpiredPayments();

      // Verify result
      expect(result).toEqual({ count: 2 });

      // Verify query
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'expired' });
      expect(mockQuery.from).toHaveBeenCalledWith('payments');
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'pending');
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<', expect.any(Date));
    });

    it('handles database errors', async () => {
      // Setup mock error
      const error = new Error('Database error');
      mockQuery.then.mockRejectedValue(error);

      // Call model
      await expect(paymentModel.markExpiredPayments()).rejects.toThrow(
        'Failed to mark expired payments'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        'Error marking expired payments:',
        expect.any(Error)
      );
    });
  });
}); 