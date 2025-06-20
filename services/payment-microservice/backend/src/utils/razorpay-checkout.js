/**
 * Razorpay Checkout Utilities
 * Generates HTML for Razorpay checkout integration
 */
const paymentConfig = require('../config/payment-config');

/**
 * Generate checkout HTML for testing Razorpay integration
 * @param {Object} order - Order details
 * @param {Object} user - User details
 * @param {boolean} isUpiIntent - Whether this is a UPI intent flow
 * @returns {string} - HTML for Razorpay checkout
 */
const generateCheckoutHTML = (order, user, isUpiIntent = false) => {
  const razorpayConfig = paymentConfig.gateways.razorpay;
  
  // Determine if this is a subscription payment from the order notes
  const isSubscription = order.notes && order.notes.subscription_id;
  const subscriptionId = isSubscription ? order.notes.subscription_id : null;
  const verifyEndpoint = isSubscription 
    ? '/api/payment/verify-subscription-payment'
    : '/api/payment/verify-payment';
  
  const successRedirect = isSubscription
    ? `/test/subscription-dashboard/subscription-details?id=${subscriptionId}`
    : '/test/payment-success?txn=';
  
  // Get key ID directly from environment fallback for absolute reliability
  const razorpayKeyId = razorpayConfig.credentials.key_id || process.env.RAZORPAY_KEY_ID || 'rzp_test_wsmyEOUbhu4SYa';
  
  // For UPI intent flow, show a different page with QR code and deep link
  if (isUpiIntent && order.intent_url) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPI Payment</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    h1 {
      color: #333;
    }
    .payment-container {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-top: 20px;
    }
    .qr-code {
      margin: 20px 0;
    }
    .upi-button {
      display: inline-block;
      background-color: #2d88ff;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      margin: 10px;
    }
    .order-details {
      margin: 20px 0;
      text-align: left;
    }
    .order-details div {
      margin: 8px 0;
    }
    #status-check {
      margin-top: 20px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>UPI Payment</h1>
  
  <div class="payment-container">
    <div class="order-details">
      <div><strong>Order ID:</strong> ${order.order_id}</div>
      <div><strong>Amount:</strong> ${order.amount} ${order.currency}</div>
      <div><strong>Created:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString()}</div>
    </div>
    
    <div class="qr-code">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.intent_url)}" alt="UPI QR Code" />
    </div>
    
    <a href="${order.intent_url}" class="upi-button">Pay with UPI App</a>
    
    <div id="status-check">
      Checking payment status...
    </div>
  </div>
  
  <script>
    // Function to check payment status
    function checkPaymentStatus() {
      fetch('/api/payment/status/${order.order_id}')
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            window.location.href = '${successRedirect}' + data.payment.transaction_id;
          } else if (data.status === 'pending') {
            setTimeout(checkPaymentStatus, 5000);
          } else {
            document.getElementById('status-check').textContent = 'Payment failed: ' + data.message;
          }
        })
        .catch(error => {
          console.error('Error checking payment status:', error);
          setTimeout(checkPaymentStatus, 5000);
        });
    }
    
    // Start checking payment status
    setTimeout(checkPaymentStatus, 5000);
  </script>
</body>
</html>`;
  }
  
  // For regular checkout flow, return the normal checkout page
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSubscription ? 'Subscription Payment' : 'Payment Test Page'}</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js" defer></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #333;
    }
    .payment-container {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-top: 20px;
    }
    button {
      background-color: #2d88ff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 15px;
      font-size: 16px;
      cursor: pointer;
    }
    .order-details {
      margin-bottom: 20px;
    }
    .order-details div {
      margin-bottom: 8px;
    }
    #debug-info {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      display: none;
    }
    .debug-toggle {
      margin-top: 20px;
      color: #999;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${isSubscription ? 'Subscription Payment' : 'Payment Test Page'}</h1>
  
  <div class="payment-container">
    <div class="order-details">
      <div><strong>Order ID:</strong> ${order.order_id}</div>
      <div><strong>Amount:</strong> ${order.amount} ${order.currency}</div>
      ${isSubscription ? `<div><strong>Subscription ID:</strong> ${subscriptionId}</div>` : ''}
      <div><strong>Created:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString()}</div>
    </div>
    
    <button id="pay-button">Pay with Razorpay</button>
  </div>
  
  <div class="debug-toggle" onclick="toggleDebug()">Show Debug Info</div>
  <div id="debug-info"></div>
  
  <script nonce="payment-test-nonce">
    document.addEventListener('DOMContentLoaded', function() {
      const payButton = document.getElementById('pay-button');
      const options = {
        key: '${razorpayKeyId}',
        amount: ${order.amount},
        currency: '${order.currency}',
        name: 'Payment Test',
        description: 'Test Payment',
        order_id: '${order.order_id}',
        handler: function(response) {
          // Handle payment success
          const verifyData = {
            order_id: '${order.order_id}',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          };
          
          // Send verification request
          fetch('${verifyEndpoint}', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(verifyData)
          })
          .then(response => response.json())
          .then(data => {
            if (data.status === 'success') {
              window.location.href = '${successRedirect}' + response.razorpay_payment_id;
            } else {
              alert('Payment verification failed: ' + data.message);
            }
          })
          .catch(error => {
            console.error('Error verifying payment:', error);
            alert('Error verifying payment. Please contact support.');
          });
        },
        prefill: {
          name: '${user.displayName}',
          email: '${user.email}'
        },
        theme: {
          color: '#3399cc'
        }
      };
      
      payButton.onclick = function() {
        const rzp = new Razorpay(options);
        rzp.open();
      };
    });
  </script>
</body>
</html>
  `;
};

module.exports = {
  generateCheckoutHTML
}; 