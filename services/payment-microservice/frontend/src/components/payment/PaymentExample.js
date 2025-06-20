import React, { useState } from 'react';
import PaymentButton from './PaymentButton';
import SubscribeButton from './SubscribeButton';
import PaymentStatus from './PaymentStatus';
import './PaymentExample.css';

const PaymentExample = () => {
  const [orderId, setOrderId] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);

  const handlePaymentSuccess = (result) => {
    console.log('Payment successful:', result);
    setOrderId(result.order_id);
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
  };

  const handleSubscriptionSuccess = (result) => {
    console.log('Subscription successful:', result);
    setSubscriptionId(result.subscription_id);
  };

  const handleSubscriptionError = (error) => {
    console.error('Subscription failed:', error);
  };

  return (
    <div className="payment-example">
      <div className="payment-section">
        <h2>One-time Payment</h2>
        <PaymentButton
          amount={1000}
          description="Test Payment"
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        >
          Pay ₹1000
        </PaymentButton>
        {orderId && (
          <PaymentStatus
            orderId={orderId}
            onStatusChange={(status) => console.log('Payment status:', status)}
          />
        )}
      </div>

      <div className="payment-section">
        <h2>Subscription</h2>
        <SubscribeButton
          planId="plan_monthly"
          onSuccess={handleSubscriptionSuccess}
          onError={handleSubscriptionError}
        >
          Subscribe Monthly
        </SubscribeButton>
        {subscriptionId && (
          <PaymentStatus
            orderId={subscriptionId}
            onStatusChange={(status) => console.log('Subscription status:', status)}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentExample; 