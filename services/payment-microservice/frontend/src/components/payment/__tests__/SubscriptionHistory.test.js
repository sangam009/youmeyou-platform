import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import SubscriptionHistory from '../SubscriptionHistory';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('SubscriptionHistory', () => {
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

  const mockSubscriptions = [
    {
      id: 'sub_1',
      plan: 'premium',
      interval: 'monthly',
      status: 'active',
      currentPeriodEnd: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sub_2',
      plan: 'basic',
      interval: 'yearly',
      status: 'cancelled',
      currentPeriodEnd: '2024-06-30',
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
      <SubscriptionHistory userId="user_123" />
    );

    expect(getByText('Subscription History')).toBeInTheDocument();
    expect(getByText('Loading subscriptions...')).toBeInTheDocument();
  });

  it('loads and displays subscriptions', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionHistory userId="user_123" />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'subscriptions/user_123'
    );

    // Simulate subscriptions data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockSubscriptions);

    // Wait for subscriptions to be displayed
    await waitFor(() => {
      expect(queryByText('Loading subscriptions...')).not.toBeInTheDocument();
      expect(getByText('Premium')).toBeInTheDocument();
      expect(getByText('Basic')).toBeInTheDocument();
      expect(getByText('Active')).toBeInTheDocument();
      expect(getByText('Cancelled')).toBeInTheDocument();
      expect(getByText('Monthly')).toBeInTheDocument();
      expect(getByText('Yearly')).toBeInTheDocument();
    });
  });

  it('handles empty subscriptions list', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionHistory userId="user_123" />
    );

    // Simulate empty subscriptions data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading subscriptions...')).not.toBeInTheDocument();
      expect(getByText('No subscriptions found')).toBeInTheDocument();
    });
  });

  it('handles subscription click', async () => {
    const onSubscriptionClick = jest.fn();
    const { getByText } = render(
      <SubscriptionHistory userId="user_123" onSubscriptionClick={onSubscriptionClick} />
    );

    // Simulate subscriptions data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback(mockSubscriptions);

    // Wait for subscriptions to be displayed
    await waitFor(() => {
      expect(getByText('Premium')).toBeInTheDocument();
    });

    // Click on subscription
    fireEvent.click(getByText('Premium'));

    // Verify click handler
    expect(onSubscriptionClick).toHaveBeenCalledWith(mockSubscriptions[0]);
  });

  it('handles custom limit', async () => {
    render(
      <SubscriptionHistory userId="user_123" limit={5} />
    );

    // Verify Firebase query
    expect(mockFirebase.database().ref().child().limitToLast).toHaveBeenCalledWith(5);
  });

  it('handles custom empty state text', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionHistory userId="user_123" emptyText="No subscription records" />
    );

    // Simulate empty subscriptions data
    const valueCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    valueCallback([]);

    // Wait for empty state
    await waitFor(() => {
      expect(queryByText('Loading subscriptions...')).not.toBeInTheDocument();
      expect(getByText('No subscription records')).toBeInTheDocument();
    });
  });

  it('handles custom loading text', () => {
    const { getByText } = render(
      <SubscriptionHistory userId="user_123" loadingText="Fetching subscriptions..." />
    );

    expect(getByText('Fetching subscriptions...')).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <SubscriptionHistory userId="user_123" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <SubscriptionHistory userId="user_123" />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SubscriptionHistory userId="user_123" />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error loading subscriptions:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 