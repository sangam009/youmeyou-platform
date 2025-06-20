import React from 'react';
import { render, waitFor } from '@testing-library/react';
import RefundStatus from '../RefundStatus';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('RefundStatus', () => {
  const mockFirebase = {
    database: jest.fn().mockReturnValue({
      ref: jest.fn().mockReturnValue({
        child: jest.fn().mockReturnValue({
          on: jest.fn(),
          off: jest.fn()
        })
      })
    })
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup firebase context mock
    useFirebase.mockReturnValue({
      firebase: mockFirebase
    });
  });

  it('renders correctly with initial status', () => {
    const { getByText } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    expect(getByText('Refund Status: Pending')).toBeInTheDocument();
  });

  it('subscribes to refund status updates', async () => {
    const { getByText } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'refunds/user_123/refund_123'
    );

    // Simulate status update
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({ status: 'completed' });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Refund Status: Completed')).toBeInTheDocument();
    });
  });

  it('handles status changes', async () => {
    const { getByText } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate status changes
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];

    // Test completed status
    statusCallback({ status: 'completed' });
    await waitFor(() => {
      expect(getByText('Refund Status: Completed')).toBeInTheDocument();
    });

    // Test failed status
    statusCallback({ status: 'failed' });
    await waitFor(() => {
      expect(getByText('Refund Status: Failed')).toBeInTheDocument();
    });

    // Test processing status
    statusCallback({ status: 'processing' });
    await waitFor(() => {
      expect(getByText('Refund Status: Processing')).toBeInTheDocument();
    });
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles custom status text', () => {
    const { getByText } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
        statusText="Custom Status"
      />
    );

    expect(getByText('Custom Status: Pending')).toBeInTheDocument();
  });

  it('handles custom status class', () => {
    const { container } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles status with additional data', async () => {
    const { getByText } = render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate status update with additional data
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({
      status: 'completed',
      amount: 1000,
      currency: 'INR',
      reason: 'Customer request'
    });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Refund Status: Completed')).toBeInTheDocument();
      expect(getByText('Amount: ₹10.00')).toBeInTheDocument();
      expect(getByText('Reason: Customer request')).toBeInTheDocument();
    });
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RefundStatus
        refundId="refund_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error subscribing to refund status:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 