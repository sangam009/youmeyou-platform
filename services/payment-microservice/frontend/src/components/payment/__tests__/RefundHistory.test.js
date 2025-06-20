import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import RefundHistory from '../RefundHistory';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('RefundHistory', () => {
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

  const mockRefunds = [
    {
      id: 'refund_1',
      amount: 1000,
      currency: 'INR',
      status: 'completed',
      reason: 'Customer request',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'refund_2',
      amount: 2000,
      currency: 'INR',
      status: 'failed',
      reason: 'Invalid request',
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
      <RefundHistory userId="user_123" />
    );

    expect(getByText('Refund History')).toBeInTheDocument();
    expect(getByText('Loading refunds...')).toBeInTheDocument();
  });

  it('loads and displays refunds', async () => {
    const { getByText, queryByText } = render(
      <RefundHistory userId="user_123" />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'refunds/user_123'
    );

    // Simulate refunds data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockRefunds);

    // Wait for refunds to be displayed
    await waitFor(() => {
      expect(queryByText('Loading refunds...')).not.toBeInTheDocument();
      expect(getByText('₹10.00')).toBeInTheDocument();
      expect(getByText('₹20.00')).toBeInTheDocument();
      expect(getByText('Completed')).toBeInTheDocument();
      expect(getByText('Failed')).toBeInTheDocument();
      expect(getByText('Customer request')).toBeInTheDocument();
      expect(getByText('Invalid request')).toBeInTheDocument();
    });
  });

  it('handles empty refunds list', async () => {
    const { getByText, queryByText } = render(
      <RefundHistory userId="user_123" />
    );

    // Simulate empty refunds data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading refunds...')).not.toBeInTheDocument();
      expect(getByText('No refunds found')).toBeInTheDocument();
    });
  });

  it('handles refund click', async () => {
    const onRefundClick = jest.fn();
    const { getByText } = render(
      <RefundHistory userId="user_123" onRefundClick={onRefundClick} />
    );

    // Simulate refunds data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockRefunds);

    // Wait for refunds to be displayed
    await waitFor(() => {
      expect(getByText('₹10.00')).toBeInTheDocument();
    });

    // Click on refund
    fireEvent.click(getByText('₹10.00'));

    // Verify click handler
    expect(onRefundClick).toHaveBeenCalledWith(mockRefunds[0]);
  });

  it('handles custom limit', async () => {
    render(
      <RefundHistory userId="user_123" limit={5} />
    );

    // Verify Firebase query
    expect(mockFirebase.database().ref().child().limitToLast).toHaveBeenCalledWith(5);
  });

  it('handles custom empty state text', async () => {
    const { getByText, queryByText } = render(
      <RefundHistory userId="user_123" emptyText="No refund records" />
    );

    // Simulate empty refunds data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading refunds...')).not.toBeInTheDocument();
      expect(getByText('No refund records')).toBeInTheDocument();
    });
  });

  it('handles custom loading text', () => {
    const { getByText } = render(
      <RefundHistory userId="user_123" loadingText="Fetching refunds..." />
    );

    expect(getByText('Fetching refunds...')).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <RefundHistory userId="user_123" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <RefundHistory userId="user_123" />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RefundHistory userId="user_123" />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error loading refunds:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 