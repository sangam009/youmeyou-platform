import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentExample from '../PaymentExample';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

// Mock Razorpay
const mockRazorpay = {
  open: jest.fn()
};
window.Razorpay = jest.fn(() => mockRazorpay);

describe('PaymentExample', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890'
  };

  const mockSubscribeToPaymentStatus = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup auth context mock
    useAuth.mockReturnValue({ user: mockUser });

    // Setup firebase context mock
    useFirebase.mockReturnValue({
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

  it('renders payment example with all sections', () => {
    render(<PaymentExample />);

    // Check for main sections
    expect(screen.getByText('One-Time Payment')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
  });

  it('handles one-time payment', async () => {
    render(<PaymentExample />);

    // Click the payment button
    fireEvent.click(screen.getByText('Pay ₹1000'));

    // Wait for axios call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/payment/create-order', {
        amount: 1000,
        currency: 'INR',
        description: 'Test Payment'
      });
    });

    // Check if Razorpay was initialized
    expect(window.Razorpay).toHaveBeenCalled();
    expect(mockRazorpay.open).toHaveBeenCalled();
  });

  it('handles subscription payment', async () => {
    render(<PaymentExample />);

    // Click the subscription button
    fireEvent.click(screen.getByText('Subscribe for ₹500/month'));

    // Wait for axios call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/payment/create-subscription', {
        plan_id: 'plan_123',
        description: 'Test Subscription'
      });
    });

    // Check if Razorpay was initialized
    expect(window.Razorpay).toHaveBeenCalled();
    expect(mockRazorpay.open).toHaveBeenCalled();
  });

  it('displays payment status updates', async () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToPaymentStatus.mockReturnValue(mockUnsubscribe);

    render(<PaymentExample />);

    // Click the payment button
    fireEvent.click(screen.getByText('Pay ₹1000'));

    // Wait for subscription
    await waitFor(() => {
      expect(mockSubscribeToPaymentStatus).toHaveBeenCalledWith(
        'order_123',
        expect.any(Function)
      );
    });

    // Simulate status update
    const statusCallback = mockSubscribeToPaymentStatus.mock.calls[0][1];
    statusCallback('success');

    await waitFor(() => {
      expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    });
  });

  it('handles payment errors', async () => {
    const errorMessage = 'Payment failed';

    // Mock axios error
    axios.post.mockRejectedValue({
      response: {
        data: {
          message: errorMessage
        }
      }
    });

    render(<PaymentExample />);

    // Click the payment button
    fireEvent.click(screen.getByText('Pay ₹1000'));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles subscription errors', async () => {
    const errorMessage = 'Subscription failed';

    // Mock axios error
    axios.post.mockRejectedValue({
      response: {
        data: {
          message: errorMessage
        }
      }
    });

    render(<PaymentExample />);

    // Click the subscription button
    fireEvent.click(screen.getByText('Subscribe for ₹500/month'));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('cleans up subscriptions on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToPaymentStatus.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(<PaymentExample />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
}); 