import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { config } from '../config';
import axios from 'axios';

function Login({ setUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the Firebase ID token
      const idToken = await result.user.getIdToken();
      const refreshToken = result._tokenResponse.refreshToken;
      
      // Create the payload for the auth service
      const payload = {
        provider: 'google',
        payload: {
          token: idToken,
          refresh_token: refreshToken,
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            phoneNumber: result.user.phoneNumber
          }
        }
      };
      
      // Send the user data to the auth service
      const response = await axios.post(`${config.apiBaseUrl}/user/create`, payload, {
        withCredentials: true
      });
      
      setResponse(response.data);
      
      if (response.data.status === 'success') {
        // Get user data from session
        const sessionResponse = await axios.get(`${config.apiBaseUrl}/session/check`, {
          withCredentials: true
        });
        
        if (sessionResponse.data.status === 'success') {
          setUser(sessionResponse.data.user);
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>
      <p>Use one of the methods below to login:</p>
      
      <button onClick={handleGoogleLogin} className="btn" disabled={loading}>
        {loading ? 'Logging in...' : 'Login with Google'}
      </button>
      
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}
      
      {response && (
        <div className="response-display">
          <h4>Response from Auth Service:</h4>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default Login; 