import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import RefundModal from '../RefundModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('RefundModal', () => {
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

  const mockPayment = {
    id: 'payment_123',
    amount: 1000,
    currency: 'USD',
    status: 'completed'
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
    const { getByText, getByRole } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />
    );

    expect(getByText('Request Refund')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('handles modal close', () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <RefundModal isOpen={true} onClose={onClose} payment={mockPayment} />
    );

    // Click close button
    fireEvent.click(getByRole('button', { name: 'Close' }));

    // Verify close handler
    expect(onClose).toHaveBeenCalled();
  });

  it('handles refund submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RefundModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} payment={mockPayment} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Reason'), {
      target: { value: 'Product not as described' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Request Refund' }));

    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        paymentId: 'payment_123',
        reason: 'Product not as described',
        userId: 'user_123'
      });
    });
  });

  it('validates required fields', async () => {
    const { getByRole, getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />
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
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />
    );

    // Fill reason with short text
    fireEvent.change(getByLabelText('Reason'), {
      target: { value: 'Too short' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Request Refund' }));

    // Verify validation message
    await waitFor(() => {
      expect(getByText('Reason must be at least 10 characters')).toBeInTheDocument();
    });
  });

  it('displays payment details correctly', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />
    );

    expect(getByText('Payment Amount: $10.00')).toBeInTheDocument();
    expect(getByText('Payment Status: completed')).toBeInTheDocument();
  });

  it('handles custom title', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} title="Custom Title" payment={mockPayment} />
    );

    expect(getByText('Custom Title')).toBeInTheDocument();
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <RefundModal isOpen={true} onClose={() => {}} buttonText="Submit Refund Request" payment={mockPayment} />
    );

    expect(getByRole('button', { name: 'Submit Refund Request' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <RefundModal isOpen={true} onClose={() => {}} className="custom-class" payment={mockPayment} />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <RefundModal isOpen={true} onClose={() => {}} isLoading={true} payment={mockPayment} />
    );

    const button = getByRole('button', { name: 'Request Refund' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <RefundModal isOpen={true} onClose={() => {}} disabled={true} payment={mockPayment} />
    );

    const button = getByRole('button', { name: 'Request Refund' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} error="Refund request failed" payment={mockPayment} />
    );

    expect(getByText('Refund request failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />
    );

    expect(getByText('Please sign in to request a refund')).toBeInTheDocument();
  });

  it('handles modal visibility', () => {
    const { container, rerender } = render(
      <RefundModal isOpen={false} onClose={() => {}} payment={mockPayment} />
    );

    // Modal should not be visible
    expect(container.firstChild).not.toBeVisible();

    // Rerender with isOpen=true
    rerender(<RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} />);

    // Modal should be visible
    expect(container.firstChild).toBeVisible();
  });

  it('handles custom currency', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={{ ...mockPayment, currency: 'EUR' }} />
    );

    expect(getByText('Payment Amount: €10.00')).toBeInTheDocument();
  });

  it('handles custom currency symbol', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} currencySymbol="₹" />
    );

    expect(getByText('Payment Amount: ₹10.00')).toBeInTheDocument();
  });

  it('handles refund policy display', () => {
    const { getByText } = render(
      <RefundModal isOpen={true} onClose={() => {}} payment={mockPayment} refundPolicy="Refunds are processed within 5-7 business days" />
    );

    expect(getByText('Refunds are processed within 5-7 business days')).toBeInTheDocument();
  });
}); 