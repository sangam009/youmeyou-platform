import React from 'react';
import { render, waitFor } from '@testing-library/react';
import PaymentStatus from '../PaymentStatus';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('PaymentStatus', () => {
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
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    expect(getByText('Payment Status: Pending')).toBeInTheDocument();
  });

  it('subscribes to payment status updates', async () => {
    const { getByText } = render(
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'payments/user_123/payment_123'
    );

    // Simulate status update
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({ status: 'completed' });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Payment Status: Completed')).toBeInTheDocument();
    });
  });

  it('handles status changes', async () => {
    const { getByText } = render(
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate status changes
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];

    // Test completed status
    statusCallback({ status: 'completed' });
    await waitFor(() => {
      expect(getByText('Payment Status: Completed')).toBeInTheDocument();
    });

    // Test failed status
    statusCallback({ status: 'failed' });
    await waitFor(() => {
      expect(getByText('Payment Status: Failed')).toBeInTheDocument();
    });

    // Test refunded status
    statusCallback({ status: 'refunded' });
    await waitFor(() => {
      expect(getByText('Payment Status: Refunded')).toBeInTheDocument();
    });
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <PaymentStatus
        paymentId="payment_123"
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
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
        statusText="Custom Status"
      />
    );

    expect(getByText('Custom Status: Pending')).toBeInTheDocument();
  });

  it('handles custom status class', () => {
    const { container } = render(
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles status with additional data', async () => {
    const { getByText } = render(
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate status update with additional data
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({
      status: 'completed',
      amount: 1000,
      currency: 'INR'
    });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Payment Status: Completed')).toBeInTheDocument();
      expect(getByText('Amount: ₹10.00')).toBeInTheDocument();
    });
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PaymentStatus
        paymentId="payment_123"
        userId="user_123"
        initialStatus="pending"
      />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error subscribing to payment status:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 