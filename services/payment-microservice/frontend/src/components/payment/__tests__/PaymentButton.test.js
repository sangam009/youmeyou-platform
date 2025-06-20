import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentButton from '../PaymentButton';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');
jest.mock('../../../services/payment.service');

// Mock Razorpay
const mockRazorpay = {
  open: jest.fn()
};
window.Razorpay = jest.fn(() => mockRazorpay);

describe('PaymentButton', () => {
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

  const mockSubscribeToPaymentStatus = jest.fn();

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
      firebase: mockFirebase,
      subscribeToPaymentStatus: mockSubscribeToPaymentStatus
    });

    // Setup axios mock
    axios.post.mockResolvedValue({
      data: {
        status: 'success',
        order_id: 'order_123'
      }
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(getByText('Pay ₹10.00')).toBeInTheDocument();
  });

  it('handles payment initiation', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Click payment button
    fireEvent.click(getByText('Pay ₹10.00'));

    // Wait for payment initiation
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles payment errors', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    // Mock payment service error
    const mockError = new Error('Payment failed');
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Click payment button
    fireEvent.click(getByText('Pay ₹10.00'));

    // Wait for error handling
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it('shows loading state during payment', async () => {
    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Click payment button
    fireEvent.click(getByText('Pay ₹10.00'));

    // Check loading state
    expect(getByText('Processing...')).toBeInTheDocument();
  });

  it('handles UPI intent', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        upiIntent={true}
      />
    );

    // Click payment button
    fireEvent.click(getByText('Pay ₹10.00'));

    // Wait for UPI intent handling
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('cleans up Firebase listeners on unmount', () => {
    const { unmount } = render(
      <PaymentButton
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
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Verify disabled state
    expect(getByText('Pay ₹10.00')).toBeDisabled();
  });

  it('handles custom button text', () => {
    const { getByText } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        buttonText="Custom Pay"
      />
    );

    expect(getByText('Custom Pay')).toBeInTheDocument();
  });

  it('handles custom button class', () => {
    const { container } = render(
      <PaymentButton
        amount={1000}
        currency="INR"
        onSuccess={jest.fn()}
        onError={jest.fn()}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
}); 