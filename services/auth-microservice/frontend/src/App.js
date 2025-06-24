import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { config } from './config';
import axios from 'axios';

// Components
import HomePage from './components/HomePage';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import SessionTest from './components/SessionTest';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkSession = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/session/check`, { withCredentials: true });
        if (response.data.status === 'success') {
          setUser(response.data.user);
        }
      } catch (error) {
        console.log('No active session');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // First, sign out from Firebase
      await auth.signOut();
      
      // Then, call backend logout endpoint to destroy session
      const response = await axios.post(`${config.apiBaseUrl}/session/logout`, {}, {
        withCredentials: true
      });
      
      if (response.data.status === 'success') {
        // Clear user state on successful logout
        setUser(null);
        navigate('/login');
      } else {
        console.error('Backend logout failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Auth Service Test UI</h1>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          {user ? (
            <>
              <Link to="/profile">Profile</Link>
              <Link to="/session-test">Session Test</Link>
              <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/profile" element={<UserProfile user={user} setUser={setUser} />} />
        <Route path="/session-test" element={<SessionTest user={user} />} />
      </Routes>
    </div>
  );
}

export default App; 