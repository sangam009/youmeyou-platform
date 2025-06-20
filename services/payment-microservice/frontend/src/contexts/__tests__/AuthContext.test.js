import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase
jest.mock('firebase/auth');

describe('AuthContext', () => {
  const mockUser = {
    uid: 'user_123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockAuth = {
    onAuthStateChanged: jest.fn(),
    currentUser: mockUser
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Firebase mocks
    getAuth.mockReturnValue(mockAuth);
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    signOut.mockResolvedValue();
  });

  it('initializes auth on mount', () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    expect(getAuth).toHaveBeenCalled();
    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();
  });

  it('provides auth context to children', () => {
    const TestComponent = () => {
      const { user } = useAuth();
      return <div>{user ? user.email : 'No User'}</div>;
    };

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles user login', async () => {
    const TestComponent = () => {
      const { login } = useAuth();
      return (
        <button onClick={() => login('test@example.com', 'password')}>
          Login
        </button>
      );
    };

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(getByText('Login'));
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'test@example.com',
      'password'
    );
  });

  it('handles user logout', async () => {
    const TestComponent = () => {
      const { logout } = useAuth();
      return <button onClick={logout}>Logout</button>;
    };

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(getByText('Logout'));
    });

    expect(signOut).toHaveBeenCalledWith(mockAuth);
  });

  it('handles login errors', async () => {
    const errorMessage = 'Invalid credentials';
    signInWithEmailAndPassword.mockRejectedValue(new Error(errorMessage));

    const TestComponent = () => {
      const { login, error } = useAuth();
      return (
        <div>
          <button onClick={() => login('test@example.com', 'password')}>
            Login
          </button>
          {error && <div>{error}</div>}
        </div>
      );
    };

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(getByText('Login'));
    });

    expect(getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles auth state changes', () => {
    const TestComponent = () => {
      const { user } = useAuth();
      return <div>{user ? user.email : 'No User'}</div>;
    };

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Get the callback function passed to onAuthStateChanged
    const authCallback = mockAuth.onAuthStateChanged.mock.calls[0][0];

    // Simulate auth state change
    act(() => {
      authCallback(mockUser);
    });

    expect(getByText('test@example.com')).toBeInTheDocument();

    // Simulate user sign out
    act(() => {
      authCallback(null);
    });

    expect(getByText('No User')).toBeInTheDocument();
  });

  it('throws error when used outside provider', () => {
    const TestComponent = () => {
      useAuth();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    // Restore console.error
    console.error = originalError;
  });

  it('cleans up auth state listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockAuth.onAuthStateChanged.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
}); 