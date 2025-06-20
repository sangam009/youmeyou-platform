import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import './PaymentButton.css';

const PaymentButton = ({
  amount,
  currency = 'INR',
  description,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  children
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { subscribeToPaymentStatus } = useFirebase();

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create order
      const orderResponse = await axios.post('/api/payment/create-order', {
        amount,
        currency,
        description
      });

      if (orderResponse.data.status !== 'success') {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const { order_id } = orderResponse.data;

      // Subscribe to payment status updates
      const unsubscribe = subscribeToPaymentStatus(order_id, (status) => {
        if (status === 'success') {
          onSuccess?.({ order_id, status });
          unsubscribe();
        } else if (status === 'failed') {
          onError?.({ order_id, status });
          unsubscribe();
        }
      });

      // Initialize Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount * 100, // Convert to paise
        currency,
        name: 'Your Company Name',
        description,
        order_id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await axios.post('/api/payment/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
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
      className={`payment-button ${className} ${loading ? 'loading' : ''}`}
      onClick={handlePayment}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};

PaymentButton.propTypes = {
  amount: PropTypes.number.isRequired,
  currency: PropTypes.string,
  description: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired
};

export default PaymentButton; 