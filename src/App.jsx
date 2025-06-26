// src/App.jsx (UPDATED - Improved Auth Transition Handling)
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import Checklist from './Component/Checklist';
import AuthPage from './Component/AuthPage';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      // isAuthTransitioning is explicitly managed by callbacks from AuthPage now,
      // but this line ensures it eventually goes false if Firebase itself settles
      // without an explicit signal from AuthPage (e.g., direct logout from browser tools)
      setIsAuthTransitioning(false);
    });

    return () => unsubscribe();
  }, []);

  // Callback to signal the start of an auth action from AuthPage
  const handleAuthActionStart = useCallback(() => {
    setIsAuthTransitioning(true);
  }, []);

  // Callback to signal the completion of an auth action from AuthPage
  const handleAuthActionComplete = useCallback(() => {
    // This will be called by AuthPage when its internal action finishes,
    // ensuring global loading is dismissed.
    setIsAuthTransitioning(false);
  }, []);


  if (loadingAuth || isAuthTransitioning) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner"></div>
        <p style={{ color: '#a8dadc', fontSize: '1.2em' }}>
          {isAuthTransitioning ? 'Processing authentication...' : 'Loading application...'}
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <Checklist user={user} />
      ) : (
        <AuthPage
          onLoginSuccess={() => { /* Firebase listener handles state update */ }}
          onAuthActionStart={handleAuthActionStart}
          onAuthActionComplete={handleAuthActionComplete} // Pass the new callback
        />
      )}
    </div>
  );
};

export default App;
