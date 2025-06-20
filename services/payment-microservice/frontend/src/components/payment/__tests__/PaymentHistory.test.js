import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import PaymentHistory from '../PaymentHistory';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('PaymentHistory', () => {
  const mockFirebase = {
    database: jest.fn().mockReturnValue({
      ref: jest.fn().mockReturnValue({
        child: jest.fn().mockReturnValue({
          on: jest.fn(),
          off: jest.fn(),
          orderByChild: jest.fn().mockReturnThis(),
          limitToLast: jest.fn().mockReturnThis()
        })
      })
    })
  };

  const mockPayments = [
    {
      id: 'payment_1',
      amount: 1000,
      currency: 'INR',
      status: 'completed',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'payment_2',
      amount: 2000,
      currency: 'INR',
      status: 'failed',
      createdAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup firebase context mock
    useFirebase.mockReturnValue({
      firebase: mockFirebase
    });
  });

  it('renders correctly with initial state', () => {
    const { getByText } = render(
      <PaymentHistory userId="user_123" />
    );

    expect(getByText('Payment History')).toBeInTheDocument();
    expect(getByText('Loading payments...')).toBeInTheDocument();
  });

  it('loads and displays payments', async () => {
    const { getByText, queryByText } = render(
      <PaymentHistory userId="user_123" />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'payments/user_123'
    );

    // Simulate payments data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockPayments);

    // Wait for payments to be displayed
    await waitFor(() => {
      expect(queryByText('Loading payments...')).not.toBeInTheDocument();
      expect(getByText('₹10.00')).toBeInTheDocument();
      expect(getByText('₹20.00')).toBeInTheDocument();
      expect(getByText('Completed')).toBeInTheDocument();
      expect(getByText('Failed')).toBeInTheDocument();
    });
  });

  it('handles empty payments list', async () => {
    const { getByText, queryByText } = render(
      <PaymentHistory userId="user_123" />
    );

    // Simulate empty payments data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading payments...')).not.toBeInTheDocument();
      expect(getByText('No payments found')).toBeInTheDocument();
    });
  });

  it('handles payment click', async () => {
    const onPaymentClick = jest.fn();
    const { getByText } = render(
      <PaymentHistory userId="user_123" onPaymentClick={onPaymentClick} />
    );

    // Simulate payments data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockPayments);

    // Wait for payments to be displayed
    await waitFor(() => {
      expect(getByText('₹10.00')).toBeInTheDocument();
    });

    // Click on payment
    fireEvent.click(getByText('₹10.00'));

    // Verify click handler
    expect(onPaymentClick).toHaveBeenCalledWith(mockPayments[0]);
  });

  it('handles custom limit', async () => {
    render(
      <PaymentHistory userId="user_123" limit={5} />
    );

    // Verify Firebase query
    expect(mockFirebase.database().ref().child().limitToLast).toHaveBeenCalledWith(5);
  });

  it('handles custom empty state text', async () => {
    const { getByText, queryByText } = render(
      <PaymentHistory userId="user_123" emptyText="No payment records" />
    );

    // Simulate empty payments data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading payments...')).not.toBeInTheDocument();
      expect(getByText('No payment records')).toBeInTheDocument();
    });
  });

  it('handles custom loading text', () => {
    const { getByText } = render(
      <PaymentHistory userId="user_123" loadingText="Fetching payments..." />
    );

    expect(getByText('Fetching payments...')).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <PaymentHistory userId="user_123" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <PaymentHistory userId="user_123" />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PaymentHistory userId="user_123" />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error loading payments:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 