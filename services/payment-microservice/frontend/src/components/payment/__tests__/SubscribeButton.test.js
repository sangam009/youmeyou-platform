import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubscribeButton from '../SubscribeButton';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');
jest.mock('../../../services/subscription.service');

// Mock Razorpay
const mockRazorpay = {
  open: jest.fn()
};
window.Razorpay = jest.fn(() => mockRazorpay);

describe('SubscribeButton', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com'
  };

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

    // Setup auth context mock
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });

    // Setup firebase context mock
    useFirebase.mockReturnValue({
      firebase: mockFirebase
    });

    // Setup axios mock
    axios.post.mockResolvedValue({
      data: {
        status: 'success',
        subscription_id: 'sub_123'
      }
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(getByText('Subscribe ₹10.00/month')).toBeInTheDocument();
  });

  it('handles subscription initiation', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Click subscribe button
    fireEvent.click(getByText('Subscribe ₹10.00/month'));

    // Wait for subscription initiation
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles subscription errors', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    // Mock subscription service error
    const mockError = new Error('Subscription failed');
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Click subscribe button
    fireEvent.click(getByText('Subscribe ₹10.00/month'));

    // Wait for error handling
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it('shows loading state during subscription', async () => {
    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Click subscribe button
    fireEvent.click(getByText('Subscribe ₹10.00/month'));

    // Check loading state
    expect(getByText('Processing...')).toBeInTheDocument();
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Unmount component
    unmount();

    // Verify Firebase cleanup
    expect(mockFirebase.database().ref().child().off).toHaveBeenCalled();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false
    });

    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Verify disabled state
    expect(getByText('Subscribe ₹10.00/month')).toBeDisabled();
  });

  it('handles custom button text', () => {
    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        buttonText="Custom Subscribe"
      />
    );

    expect(getByText('Custom Subscribe')).toBeInTheDocument();
  });

  it('handles custom button class', () => {
    const { container } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles custom interval', () => {
    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        interval="year"
      />
    );

    expect(getByText('Subscribe ₹10.00/year')).toBeInTheDocument();
  });

  it('handles custom interval text', () => {
    const { getByText } = render(
      <SubscribeButton
        planId="plan_123"
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        interval="year"
        intervalText="per year"
      />
    );

    expect(getByText('Subscribe ₹10.00 per year')).toBeInTheDocument();
  });
}); 