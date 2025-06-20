import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import RefundForm from '../RefundForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('RefundForm', () => {
  const mockUser = {
    uid: 'user_123',
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
      user: mockUser
    });

    // Setup firebase context mock
    useFirebase.mockReturnValue({
      firebase: mockFirebase
    });
  });

  it('renders correctly with initial state', () => {
    const { getByLabelText, getByRole } = render(
      <RefundForm paymentId="payment_123" />
    );

    expect(getByLabelText('Reason')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Request Refund' })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RefundForm paymentId="payment_123" onSubmit={onSubmit} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Reason'), {
      target: { value: 'Customer request' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Request Refund' }));

    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        paymentId: 'payment_123',
        reason: 'Customer request',
        userId: 'user_123'
      });
    });
  });

  it('validates required fields', async () => {
    const { getByRole, getByText } = render(
      <RefundForm paymentId="payment_123" />
    );

    // Submit form without filling required fields
    fireEvent.click(getByRole('button', { name: 'Request Refund' }));

    // Verify validation messages
    await waitFor(() => {
      expect(getByText('Reason is required')).toBeInTheDocument();
    });
  });

  it('validates reason length', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <RefundForm paymentId="payment_123" minReasonLength={10} />
    );

    // Fill reason with short text
    fireEvent.change(getByLabelText('Reason'), {
      target: { value: 'Short' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Request Refund' }));

    // Verify validation message
    await waitFor(() => {
      expect(getByText('Reason must be at least 10 characters')).toBeInTheDocument();
    });
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <RefundForm paymentId="payment_123" buttonText="Submit Refund Request" />
    );

    expect(getByRole('button', { name: 'Submit Refund Request' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <RefundForm paymentId="payment_123" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <RefundForm paymentId="payment_123" isLoading={true} />
    );

    const button = getByRole('button', { name: 'Request Refund' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <RefundForm paymentId="payment_123" disabled={true} />
    );

    const button = getByRole('button', { name: 'Request Refund' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <RefundForm paymentId="payment_123" error="Refund request failed" />
    );

    expect(getByText('Refund request failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <RefundForm paymentId="payment_123" />
    );

    expect(getByText('Please sign in to request a refund')).toBeInTheDocument();
  });

  it('handles payment details', () => {
    const paymentDetails = {
      amount: 1000,
      currency: 'INR',
      status: 'completed'
    };

    const { getByText } = render(
      <RefundForm paymentId="payment_123" paymentDetails={paymentDetails} />
    );

    expect(getByText('Amount: ₹10.00')).toBeInTheDocument();
    expect(getByText('Status: Completed')).toBeInTheDocument();
  });

  it('handles refund policy', () => {
    const { getByText } = render(
      <RefundForm paymentId="payment_123" refundPolicy="Refunds are processed within 5-7 business days" />
    );

    expect(getByText('Refund Policy:')).toBeInTheDocument();
    expect(getByText('Refunds are processed within 5-7 business days')).toBeInTheDocument();
  });
}); 