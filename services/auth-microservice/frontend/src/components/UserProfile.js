import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';
import axios from 'axios';

function UserProfile({ user, setUser }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    photoUrl: ''
  });
  const [updateResponse, setUpdateResponse] = useState(null);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/user/${user.uuid}`, {
          withCredentials: true
        });
        
        if (response.data.status === 'success') {
          setUserData(response.data.user);
          setFormData({
            displayName: response.data.user.display_name || '',
            photoUrl: response.data.user.photo_url || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setUpdateResponse(null);

    try {
      const payload = {
        uuid: user.uuid,
        payload: formData
      };

      const response = await axios.patch(`${config.apiBaseUrl}/user/update`, payload, {
        withCredentials: true
      });

      setUpdateResponse(response.data);
      
      // Refresh user data
      const userResponse = await axios.get(`${config.apiBaseUrl}/user/${user.uuid}`, {
        withCredentials: true
      });
      
      if (userResponse.data.status === 'success') {
        setUserData(userResponse.data.user);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="card">Loading user profile...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>User Profile</h2>
        
        {userData && (
          <div>
            <div className="response-display">
              <h4>Current User Data:</h4>
              <pre>{JSON.stringify(userData, null, 2)}</pre>
            </div>
            
            <h3>Update Profile</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="photoUrl">Photo URL</label>
                <input
                  type="text"
                  id="photoUrl"
                  name="photoUrl"
                  value={formData.photoUrl}
                  onChange={handleChange}
                />
              </div>
              
              <button type="submit" className="btn" disabled={updating}>
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
            
            {error && (
              <div className="alert alert-error">
                <p>{error}</p>
              </div>
            )}
            
            {updateResponse && (
              <div className="response-display">
                <h4>Update Response:</h4>
                <pre>{JSON.stringify(updateResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile; 