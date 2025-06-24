import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';
import axios from 'axios';

function SessionTest({ user }) {
  const [sessionId, setSessionId] = useState('');
  const [validateResponse, setValidateResponse] = useState(null);
  const [checkResponse, setCheckResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSessionCheck = async () => {
    setLoading(true);
    setError(null);
    setCheckResponse(null);
    
    try {
      const response = await axios.get(`${config.apiBaseUrl}/session/check`, {
        withCredentials: true
      });
      
      setCheckResponse(response.data);
    } catch (error) {
      console.error('Session check error:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionValidate = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setValidateResponse(null);
    
    try {
      const response = await axios.post(`${config.apiBaseUrl}/session/validate`, {
        sessionId
      }, {
        withCredentials: true
      });
      
      setValidateResponse(response.data);
    } catch (error) {
      console.error('Session validation error:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Session Test</h2>
      <p>This page allows you to test the session validation functionality of the auth service.</p>
      
      <div className="form-group">
        <h3>Check Current Session</h3>
        <p>Click the button below to check your current session:</p>
        <button onClick={handleSessionCheck} className="btn" disabled={loading}>
          {loading ? 'Checking...' : 'Check Session'}
        </button>
        
        {checkResponse && (
          <div className="response-display">
            <h4>Response:</h4>
            <pre>{JSON.stringify(checkResponse, null, 2)}</pre>
          </div>
        )}
      </div>
      
      <div className="form-group">
        <h3>Validate Session ID</h3>
        <p>Enter a session ID to validate:</p>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Enter session ID"
        />
        <button onClick={handleSessionValidate} className="btn" disabled={loading}>
          {loading ? 'Validating...' : 'Validate Session'}
        </button>
        
        {validateResponse && (
          <div className="response-display">
            <h4>Response:</h4>
            <pre>{JSON.stringify(validateResponse, null, 2)}</pre>
          </div>
        )}
      </div>
      
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}
      
      <div className="form-group">
        <h3>How to Get Session ID</h3>
        <p>You can find your session ID in the browser cookies. Look for a cookie named 'connect.sid'.</p>
        <p>In Chrome:</p>
        <ol>
          <li>Open Developer Tools (F12)</li>
          <li>Go to Application tab</li>
          <li>Select Cookies in the left panel</li>
          <li>Find the 'connect.sid' cookie</li>
        </ol>
      </div>
    </div>
  );
}

export default SessionTest; 