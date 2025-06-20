import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HomePage({ user }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('http://localhost:3000/health');
        console.log(response.data);
        setHealth(response.data);
      } catch (error) {
        console.error('Error checking health:', error);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div>
      <div className="card">
        <h2>Welcome to Auth Service Test UI</h2>
        {user ? (
          <p>You are logged in as: <strong>{user.uuid}</strong></p>
        ) : (
          <p>You are not logged in. Please <a href="/login">login</a> to test the auth service.</p>
        )}

        <h3>Service Health</h3>
        {loading ? (
          <p>Checking service health...</p>
        ) : health ? (
          <div className="alert alert-success">
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Message:</strong> {health.message}</p>
          </div>
        ) : (
          <div className="alert alert-error">
            <p>Auth service is not responding. Please make sure it's running.</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Available Tests</h3>
        <ul>
          <li><strong>Login:</strong> Test user login with Firebase</li>
          <li><strong>Profile:</strong> View and update user profile</li>
          <li><strong>Session Test:</strong> Test session validation</li>
        </ul>
      </div>
    </div>
  );
}

export default HomePage; 