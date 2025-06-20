import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFirebase } from '../../contexts/FirebaseContext';
import './PaymentStatus.css';

const PaymentStatus = ({
  orderId,
  onStatusChange,
  className = ''
}) => {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const { subscribeToPaymentStatus } = useFirebase();

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToPaymentStatus(orderId, (newStatus, error) => {
      setStatus(newStatus);
      setError(error);
      onStatusChange?.(newStatus, error);
    });

    return () => unsubscribe();
  }, [orderId, subscribeToPaymentStatus, onStatusChange]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✕';
      case 'pending':
        return '⟳';
      default:
        return '?';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return 'Payment successful!';
      case 'failed':
        return error?.message || 'Payment failed';
      case 'pending':
        return 'Processing payment...';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`payment-status ${status} ${className}`}>
      <div className="payment-status-icon">{getStatusIcon()}</div>
      <div className="payment-status-message">{getStatusMessage()}</div>
      {error && <div className="payment-status-error">{error.message}</div>}
    </div>
  );
};

PaymentStatus.propTypes = {
  orderId: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func,
  className: PropTypes.string
};

export default PaymentStatus; 