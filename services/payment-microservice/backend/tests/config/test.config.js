module.exports = {
  env: 'test',
  port: 4000,
  razorpay: {
    keyId: 'rzp_test_wsmyEOUbhu4SYa',
    keySecret: 'TeKWGYmMpmvaRLhfPU6el15s',
    webhookSecret: 'test_webhook_secret'
  },
  firebase: {
    projectId: 'payment-test',
    privateKey: 'test_private_key',
    clientEmail: 'test@example.com',
    databaseURL: 'https://payment-test.firebaseio.com'
  },
  testCard: {
    number: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '24',
    cvv: '123'
  }
}; 