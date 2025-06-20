import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/app';
import 'firebase/database';
import PropTypes from 'prop-types';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize Firebase
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    setInitialized(true);
  }, []);

  const subscribeToPaymentStatus = (orderId, callback) => {
    if (!initialized) return () => {};

    const paymentRef = firebase.database().ref(`payments/${orderId}`);
    
    const handleStatusChange = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data.status, data.error);
      }
    };

    paymentRef.on('value', handleStatusChange);

    return () => paymentRef.off('value', handleStatusChange);
  };

  const subscribeToSubscriptionStatus = (subscriptionId, callback) => {
    if (!initialized) return () => {};

    const subscriptionRef = firebase.database().ref(`subscriptions/${subscriptionId}`);
    
    const handleStatusChange = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data.status, data.error);
      }
    };

    subscriptionRef.on('value', handleStatusChange);

    return () => subscriptionRef.off('value', handleStatusChange);
  };

  const value = {
    initialized,
    subscribeToPaymentStatus,
    subscribeToSubscriptionStatus
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

FirebaseProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export default FirebaseContext; 