import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import PaymentForm from '../PaymentForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('PaymentForm', () => {
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
      <PaymentForm />
    );

    expect(getByLabelText('Amount')).toBeInTheDocument();
    expect(getByLabelText('Currency')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Pay' })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <PaymentForm onSubmit={onSubmit} />
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
      <PaymentForm />
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
      <PaymentForm />
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
      <PaymentForm minAmount={100} />
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
      <PaymentForm maxAmount={10000} />
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
      <PaymentForm currencies={['USD', 'EUR']} />
    );

    const currencySelect = getByLabelText('Currency');
    expect(currencySelect).toHaveValue('USD');
    expect(currencySelect).toHaveTextContent('USD');
    expect(currencySelect).toHaveTextContent('EUR');
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <PaymentForm buttonText="Make Payment" />
    );

    expect(getByRole('button', { name: 'Make Payment' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <PaymentForm className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <PaymentForm isLoading={true} />
    );

    const button = getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <PaymentForm disabled={true} />
    );

    const button = getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <PaymentForm error="Payment failed" />
    );

    expect(getByText('Payment failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <PaymentForm />
    );

    expect(getByText('Please sign in to make a payment')).toBeInTheDocument();
  });
}); 