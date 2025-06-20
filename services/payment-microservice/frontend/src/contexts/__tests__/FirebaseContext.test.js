import React from 'react';
import { render, act } from '@testing-library/react';
import { FirebaseProvider, useFirebase } from '../FirebaseContext';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

// Mock Firebase
jest.mock('firebase/app');
jest.mock('firebase/database');

describe('FirebaseContext', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-domain',
    databaseURL: 'test-url',
    projectId: 'test-project',
    storageBucket: 'test-bucket',
    messagingSenderId: 'test-sender',
    appId: 'test-app'
  };

  const mockApp = {};
  const mockDatabase = {};
  const mockRef = {};
  const mockCallback = jest.fn();
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Firebase mocks
    initializeApp.mockReturnValue(mockApp);
    getDatabase.mockReturnValue(mockDatabase);
    ref.mockReturnValue(mockRef);
    onValue.mockReturnValue(mockUnsubscribe);
  });

  it('initializes Firebase on mount', () => {
    render(
      <FirebaseProvider config={mockConfig}>
        <div>Test</div>
      </FirebaseProvider>
    );

    expect(initializeApp).toHaveBeenCalledWith(mockConfig);
    expect(getDatabase).toHaveBeenCalledWith(mockApp);
  });

  it('provides Firebase context to children', () => {
    const TestComponent = () => {
      const firebase = useFirebase();
      return <div>{firebase ? 'Firebase Available' : 'No Firebase'}</div>;
    };

    const { getByText } = render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    expect(getByText('Firebase Available')).toBeInTheDocument();
  });

  it('subscribes to payment status updates', () => {
    const TestComponent = () => {
      const { subscribeToPaymentStatus } = useFirebase();
      React.useEffect(() => {
        subscribeToPaymentStatus('order_123', mockCallback);
      }, [subscribeToPaymentStatus]);
      return null;
    };

    render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    expect(ref).toHaveBeenCalledWith(mockDatabase, 'payments/order_123/status');
    expect(onValue).toHaveBeenCalledWith(mockRef, expect.any(Function));
  });

  it('subscribes to subscription status updates', () => {
    const TestComponent = () => {
      const { subscribeToSubscriptionStatus } = useFirebase();
      React.useEffect(() => {
        subscribeToSubscriptionStatus('sub_123', mockCallback);
      }, [subscribeToSubscriptionStatus]);
      return null;
    };

    render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    expect(ref).toHaveBeenCalledWith(mockDatabase, 'subscriptions/sub_123/status');
    expect(onValue).toHaveBeenCalledWith(mockRef, expect.any(Function));
  });

  it('unsubscribes from status updates', () => {
    const TestComponent = () => {
      const { subscribeToPaymentStatus } = useFirebase();
      React.useEffect(() => {
        const unsubscribe = subscribeToPaymentStatus('order_123', mockCallback);
        return () => unsubscribe();
      }, [subscribeToPaymentStatus]);
      return null;
    };

    const { unmount } = render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    unmount();

    expect(off).toHaveBeenCalledWith(mockRef);
  });

  it('handles status updates', () => {
    const TestComponent = () => {
      const { subscribeToPaymentStatus } = useFirebase();
      React.useEffect(() => {
        subscribeToPaymentStatus('order_123', mockCallback);
      }, [subscribeToPaymentStatus]);
      return null;
    };

    render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    // Get the callback function passed to onValue
    const statusCallback = onValue.mock.calls[0][1];

    // Simulate a status update
    act(() => {
      statusCallback({ val: () => 'success' });
    });

    expect(mockCallback).toHaveBeenCalledWith('success');
  });

  it('handles null status updates', () => {
    const TestComponent = () => {
      const { subscribeToPaymentStatus } = useFirebase();
      React.useEffect(() => {
        subscribeToPaymentStatus('order_123', mockCallback);
      }, [subscribeToPaymentStatus]);
      return null;
    };

    render(
      <FirebaseProvider config={mockConfig}>
        <TestComponent />
      </FirebaseProvider>
    );

    // Get the callback function passed to onValue
    const statusCallback = onValue.mock.calls[0][1];

    // Simulate a null status update
    act(() => {
      statusCallback({ val: () => null });
    });

    expect(mockCallback).toHaveBeenCalledWith(null);
  });

  it('throws error when used outside provider', () => {
    const TestComponent = () => {
      useFirebase();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFirebase must be used within a FirebaseProvider');

    // Restore console.error
    console.error = originalError;
  });
}); 