import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import SubscriptionModal from '../SubscriptionModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/FirebaseContext');

describe('SubscriptionModal', () => {
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

  const mockPlans = [
    { id: 'basic', name: 'Basic', price: 1000 },
    { id: 'premium', name: 'Premium', price: 2000 }
  ];

  const mockIntervals = [
    { id: 'monthly', name: 'Monthly', multiplier: 1 },
    { id: 'yearly', name: 'Yearly', multiplier: 0.8 }
  ];

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
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />
    );

    expect(getByText('Subscription Details')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('handles modal close', () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <SubscriptionModal isOpen={true} onClose={onClose} plans={mockPlans} intervals={mockIntervals} />
    );

    // Click close button
    fireEvent.click(getByRole('button', { name: 'Close' }));

    // Verify close handler
    expect(onClose).toHaveBeenCalled();
  });

  it('handles subscription submission', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} plans={mockPlans} intervals={mockIntervals} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Plan'), {
      target: { value: 'premium' }
    });
    fireEvent.change(getByLabelText('Interval'), {
      target: { value: 'yearly' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Subscribe' }));

    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        planId: 'premium',
        intervalId: 'yearly',
        userId: 'user_123'
      });
    });
  });

  it('validates required fields', async () => {
    const { getByRole, getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />
    );

    // Submit form without filling required fields
    fireEvent.click(getByRole('button', { name: 'Subscribe' }));

    // Verify validation messages
    await waitFor(() => {
      expect(getByText('Plan is required')).toBeInTheDocument();
      expect(getByText('Interval is required')).toBeInTheDocument();
    });
  });

  it('displays plan prices correctly', () => {
    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />
    );

    // Check basic plan prices
    expect(getByText('Basic - $10.00/month')).toBeInTheDocument();
    expect(getByText('Basic - $96.00/year')).toBeInTheDocument();

    // Check premium plan prices
    expect(getByText('Premium - $20.00/month')).toBeInTheDocument();
    expect(getByText('Premium - $192.00/year')).toBeInTheDocument();
  });

  it('handles custom title', () => {
    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} title="Custom Title" plans={mockPlans} intervals={mockIntervals} />
    );

    expect(getByText('Custom Title')).toBeInTheDocument();
  });

  it('handles custom button text', () => {
    const { getByRole } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} buttonText="Start Subscription" plans={mockPlans} intervals={mockIntervals} />
    );

    expect(getByRole('button', { name: 'Start Subscription' })).toBeInTheDocument();
  });

  it('handles custom class', () => {
    const { container } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} className="custom-class" plans={mockPlans} intervals={mockIntervals} />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles loading state', async () => {
    const { getByRole } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} isLoading={true} plans={mockPlans} intervals={mockIntervals} />
    );

    const button = getByRole('button', { name: 'Subscribe' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('handles disabled state', () => {
    const { getByRole } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} disabled={true} plans={mockPlans} intervals={mockIntervals} />
    );

    const button = getByRole('button', { name: 'Subscribe' });
    expect(button).toBeDisabled();
  });

  it('handles error state', () => {
    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} error="Subscription failed" plans={mockPlans} intervals={mockIntervals} />
    );

    expect(getByText('Subscription failed')).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    // Setup unauthenticated state
    useAuth.mockReturnValue({
      user: null
    });

    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />
    );

    expect(getByText('Please sign in to subscribe')).toBeInTheDocument();
  });

  it('handles modal visibility', () => {
    const { container, rerender } = render(
      <SubscriptionModal isOpen={false} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />
    );

    // Modal should not be visible
    expect(container.firstChild).not.toBeVisible();

    // Rerender with isOpen=true
    rerender(<SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} />);

    // Modal should be visible
    expect(container.firstChild).toBeVisible();
  });

  it('handles custom currency', () => {
    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} currency="EUR" />
    );

    expect(getByText('Basic - €10.00/month')).toBeInTheDocument();
    expect(getByText('Premium - €20.00/month')).toBeInTheDocument();
  });

  it('handles custom currency symbol', () => {
    const { getByText } = render(
      <SubscriptionModal isOpen={true} onClose={() => {}} plans={mockPlans} intervals={mockIntervals} currencySymbol="₹" />
    );

    expect(getByText('Basic - ₹10.00/month')).toBeInTheDocument();
    expect(getByText('Premium - ₹20.00/month')).toBeInTheDocument();
  });
}); 