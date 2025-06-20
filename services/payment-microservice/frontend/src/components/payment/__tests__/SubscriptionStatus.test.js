import React from 'react';
import { render, waitFor } from '@testing-library/react';
import SubscriptionStatus from '../SubscriptionStatus';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/FirebaseContext');

describe('SubscriptionStatus', () => {
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
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    expect(getByText('Subscription Status: Active')).toBeInTheDocument();
  });

  it('subscribes to subscription status updates', async () => {
    const { getByText } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    // Verify Firebase subscription
    expect(mockFirebase.database().ref().child).toHaveBeenCalledWith(
      'subscriptions/user_123/sub_123'
    );

    // Simulate status update
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({ status: 'cancelled' });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Subscription Status: Cancelled')).toBeInTheDocument();
    });
  });

  it('handles status changes', async () => {
    const { getByText } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    // Simulate status changes
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];

    // Test active status
    statusCallback({ status: 'active' });
    await waitFor(() => {
      expect(getByText('Subscription Status: Active')).toBeInTheDocument();
    });

    // Test cancelled status
    statusCallback({ status: 'cancelled' });
    await waitFor(() => {
      expect(getByText('Subscription Status: Cancelled')).toBeInTheDocument();
    });

    // Test expired status
    statusCallback({ status: 'expired' });
    await waitFor(() => {
      expect(getByText('Subscription Status: Expired')).toBeInTheDocument();
    });
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles custom status text', () => {
    const { getByText } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
        statusText="Custom Status"
      />
    );

    expect(getByText('Custom Status: Active')).toBeInTheDocument();
  });

  it('handles custom status class', () => {
    const { container } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles status with additional data', async () => {
    const { getByText } = render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    // Simulate status update with additional data
    const statusCallback = mockFirebase.database().ref().child().on.mock.calls[0][1];
    statusCallback({
      status: 'active',
      plan: 'premium',
      interval: 'monthly',
      currentPeriodEnd: '2024-12-31'
    });

    // Wait for status update
    await waitFor(() => {
      expect(getByText('Subscription Status: Active')).toBeInTheDocument();
      expect(getByText('Plan: Premium')).toBeInTheDocument();
      expect(getByText('Interval: Monthly')).toBeInTheDocument();
      expect(getByText('Current Period Ends: 2024-12-31')).toBeInTheDocument();
    });
  });

  it('handles Firebase errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SubscriptionStatus
        subscriptionId="sub_123"
        userId="user_123"
        initialStatus="active"
      />
    );

    // Simulate Firebase error
    const errorCallback = mockFirebase.database().ref().child().on.mock.calls[0][2];
    errorCallback(new Error('Firebase error'));

    // Verify error handling
    expect(consoleError).toHaveBeenCalledWith(
      'Error subscribing to subscription status:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
}); 