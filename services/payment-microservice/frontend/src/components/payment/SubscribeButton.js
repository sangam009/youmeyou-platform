import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import './SubscribeButton.css';

const SubscribeButton = ({
  planId,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  children
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { subscribeToSubscriptionStatus } = useFirebase();

  const handleSubscription = async () => {
    try {
      setLoading(true);

      // Create subscription
      const subscriptionResponse = await axios.post('/api/payment/subscribe', {
        plan_id: planId
      });

      if (subscriptionResponse.data.status !== 'success') {
        throw new Error(subscriptionResponse.data.message || 'Failed to create subscription');
      }

      const { subscription_id } = subscriptionResponse.data;

      // Subscribe to subscription status updates
      const unsubscribe = subscribeToSubscriptionStatus(subscription_id, (status) => {
        if (status === 'active') {
          onSuccess?.({ subscription_id, status });
          unsubscribe();
        } else if (status === 'failed') {
          onError?.({ subscription_id, status });
          unsubscribe();
        }
      });

      // Initialize Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        subscription_id,
        name: 'Your Company Name',
        description: 'Subscription Payment',
        handler: async (response) => {
          try {
            // Verify subscription
            const verifyResponse = await axios.post('/api/payment/verify-subscription', {
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.data.status === 'success') {
              onSuccess?.(verifyResponse.data);
            } else {
              onError?.(verifyResponse.data);
            }
          } catch (error) {
            onError?.(error.response?.data || { message: error.message });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: {
          color: '#3399cc'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      onError?.(error.response?.data || { message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`subscribe-button ${className} ${loading ? 'loading' : ''}`}
      onClick={handleSubscription}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};

SubscribeButton.propTypes = {
  planId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired
};

export default SubscribeButton; 