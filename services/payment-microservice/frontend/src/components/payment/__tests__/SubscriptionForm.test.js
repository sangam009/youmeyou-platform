import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import SubscriptionForm from '../SubscriptionForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('SubscriptionForm', () => {
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
      <SubscriptionForm />
    );

    expect(getByLabelText('Plan')).toBeInTheDocument();
    expect(getByLabelText('Interval')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <SubscriptionForm onSubmit={onSubmit} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Plan'), {
      target: { value: 'premium' }
    });
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'monthly' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Subscribe' }));

    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        plan: 'premium',
        interval: 'monthly',
        userId: 'user_123'
      });
    });
  });

  it('validates required fields', async () => {
    const { getByRole, getByText } = render(
      <SubscriptionForm />
    );

    // Submit form without filling required fields
    fireEvent.click(getByRole('button', { name: 'Subscribe' }));

    // Verify validation messages
    await waitFor(() => {
      expect(getByText('Plan is required')).toBeInTheDocument();
      expect(getByText('Interval is required')).toBeInTheDocument();
    });
  });

  it('handles custom plans', () => {
    const { getByLabelText } = render(
      <SubscriptionForm plans={['basic', 'pro', 'enterprise']} />
    );

    const planSelect = getByLabelText('Plan');
    expect(planSelect).toHaveValue('basic');
    expect(planSelect).toHaveTextContent('basic');
    expect(planSelect).toHaveTextContent('pro');
    expect(planSelect).toHaveTextContent('enterprise');
  });

  it('handles custom intervals', () => {
    const { getByLabelText } = render(
      <SubscriptionForm intervals={['weekly', 'monthly', 'yearly']} />
    );

    const intervalSelect = getByLabelText('Interval');
    expect(intervalSelect).toHaveValue('weekly');
    expect(intervalSelect).toHaveTextContent('weekly');
    expect(intervalSelect).toHaveTextContent('monthly');
    expect(intervalSelect).toHaveTextContent('yearly');
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <SubscriptionForm buttonText="Start Subscription" />
    );

    expect(getByRole('button', { name: 'Start Subscription' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <SubscriptionForm className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <SubscriptionForm isLoading={true} />
    );

    const button = getByRole('button', { name: 'Subscribe' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <SubscriptionForm disabled={true} />
    );

    const button = getByRole('button', { name: 'Subscribe' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <SubscriptionForm error="Subscription failed" />
    );

    expect(getByText('Subscription failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <SubscriptionForm />
    );

    expect(getByText('Please sign in to subscribe')).toBeInTheDocument();
  });

  it('handles plan prices', () => {
    const planPrices = {
      basic: {
        monthly: 10,
        yearly: 100
      },
      premium: {
        monthly: 20,
        yearly: 200
      }
    };

    const { getByText } = render(
      <SubscriptionForm planPrices={planPrices} />
    );

    // Select basic plan
    fireEvent.change(getByLabelText('Plan'), {
      target: { value: 'basic' }
    });

    // Check monthly price
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'monthly' }
    });
    expect(getByText('$10/month')).toBeInTheDocument();

    // Check yearly price
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'yearly' }
    });
    expect(getByText('$100/year')).toBeInTheDocument();

    // Select premium plan
    fireEvent.change(getByLabelText('Plan'), {
      target: { value: 'premium' }
    });

    // Check monthly price
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'monthly' }
    });
    expect(getByText('$20/month')).toBeInTheDocument();

    // Check yearly price
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'yearly' }
    });
    expect(getByText('$200/year')).toBeInTheDocument();
  });
}); 