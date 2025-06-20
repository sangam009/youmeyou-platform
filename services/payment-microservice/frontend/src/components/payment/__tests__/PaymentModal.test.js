import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import PaymentModal from '../PaymentModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('PaymentModal', () => {
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
    const { getByText, getByRole } = render(
      <PaymentModal isOpen={true} onClose={() => {}} />
    );

    expect(getByText('Payment Details')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('handles modal close', () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <PaymentModal isOpen={true} onClose={onClose} />
    );

    // Click close button
    fireEvent.click(getByRole('button', { name: 'Close' }));

    // Verify close handler
    expect(onClose).toHaveBeenCalled();
  });

  it('handles payment submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <PaymentModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Amount'), {
      target: { value: '1000' }
    });
    fireEvent.change(getByLabelText('Currency'), {
      target: { value: 'INR' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Pay' }));

    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'INR',
        userId: 'user_123'
      });
    });
  });

  it('validates required fields', async () => {
    const { getByRole, getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} />
    );

    // Submit form without filling required fields
    fireEvent.click(getByRole('button', { name: 'Pay' }));

    // Verify validation messages
    await waitFor(() => {
      expect(getByText('Amount is required')).toBeInTheDocument();
      expect(getByText('Currency is required')).toBeInTheDocument();
    });
  });

  it('validates amount format', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} />
    );

    // Fill amount with invalid value
    fireEvent.change(getByLabelText('Amount'), {
      target: { value: 'invalid' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Pay' }));

    // Verify validation message
    await waitFor(() => {
      expect(getByText('Amount must be a number')).toBeInTheDocument();
    });
  });

  it('validates minimum amount', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} minAmount={100} />
    );

    // Fill amount below minimum
    fireEvent.change(getByLabelText('Amount'), {
      target: { value: '50' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Pay' }));

    // Verify validation message
    await waitFor(() => {
      expect(getByText('Amount must be at least 100')).toBeInTheDocument();
    });
  });

  it('validates maximum amount', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} maxAmount={10000} />
    );

    // Fill amount above maximum
    fireEvent.change(getByLabelText('Amount'), {
      target: { value: '15000' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Pay' }));

    // Verify validation message
    await waitFor(() => {
      expect(getByText('Amount must be at most 10000')).toBeInTheDocument();
    });
  });

  it('handles custom currencies', () => {
    const { getByLabelText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} currencies={['USD', 'EUR']} />
    );

    const currencySelect = getByLabelText('Currency');
    expect(currencySelect).toHaveValue('USD');
    expect(currencySelect).toHaveTextContent('USD');
    expect(currencySelect).toHaveTextContent('EUR');
  });

  it('handles custom title', () => {
    const { getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} title="Custom Title" />
    );

    expect(getByText('Custom Title')).toBeInTheDocument();
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <PaymentModal isOpen={true} onClose={() => {}} buttonText="Make Payment" />
    );

    expect(getByRole('button', { name: 'Make Payment' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <PaymentModal isOpen={true} onClose={() => {}} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <PaymentModal isOpen={true} onClose={() => {}} isLoading={true} />
    );

    const button = getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <PaymentModal isOpen={true} onClose={() => {}} disabled={true} />
    );

    const button = getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} error="Payment failed" />
    );

    expect(getByText('Payment failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <PaymentModal isOpen={true} onClose={() => {}} />
    );

    expect(getByText('Please sign in to make a payment')).toBeInTheDocument();
  });

  it('handles modal visibility', () => {
    const { container, rerender } = render(
      <PaymentModal isOpen={false} onClose={() => {}} />
    );

    // Modal should not be visible
    expect(container.firstChild).not.toBeVisible();

    // Rerender with isOpen=true
    rerender(<PaymentModal isOpen={true} onClose={() => {}} />);

    // Modal should be visible
    expect(container.firstChild).toBeVisible();
  });
}); 