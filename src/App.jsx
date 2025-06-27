// src/App.jsx (UPDATED - Auto Logout on Browser/Tab Close)
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Import signOut
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import Checklist from './Component/Checklist';
import AuthPage from './Component/AuthPage';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);

  useEffect(() => {
    // --- Firebase Auth State Listener ---
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      setIsAuthTransitioning(false); // Auth transition settled for initial load

      if (currentUser) {
        setLoadingRole(true); // Start loading role
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const fetchedRole = userData.role || 'user'; // Default to 'user' if role not found
            setUserRole(fetchedRole);

            // Redirect to Admin UI if user's role is 'admin'
            if (fetchedRole === 'admin') {
              // Ensure this URL is correct for your Admin UI
              window.location.href = 'https://taskmanager-46530.web.app/';
              return; // Stop further rendering in this app as the browser will navigate away.
            }
          } else {
            console.warn("User profile not found in Firestore. Defaulting role to 'user'.", currentUser.uid);
            setUserRole('user'); // Default role if profile doesn't exist
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('user'); // Fallback to user role on error
        } finally {
          setLoadingRole(false); // Role loading complete
        }
      } else {
        setUserRole(null); // Clear role if no user
      }
    });

    // --- Auto Logout on Window/Tab Close ---
    const handleUnload = async () => {
      if (auth.currentUser) { // Only attempt sign out if a user is currently logged in
        try {
          // Attempt to sign out. This clears the local session token.
          // The network call might not complete before unload, but local token is usually cleared.
          await signOut(auth);
          console.log("User signed out on window/tab close.");
        } catch (error) {
          console.error("Error signing out on unload:", error);
          // Errors here might indicate the browser prevented the async operation.
          // However, the local token is generally cleared.
        }
      }
    };

    // Add the event listener for when the window is unloaded
    window.addEventListener('unload', handleUnload);

    // --- Cleanup Function ---
    return () => {
      unsubscribe(); // Unsubscribe from Firebase Auth state changes
      window.removeEventListener('unload', handleUnload); // Remove unload listener
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const handleAuthActionStart = useCallback(() => {
    setIsAuthTransitioning(true);
  }, []);

  const handleAuthActionComplete = useCallback(() => {
    setIsAuthTransitioning(false);
  }, []);


  // Show a loading screen if:
  // 1. App is initially loading auth state (loadingAuth)
  // 2. An auth action (login/register/logout) is in progress (isAuthTransitioning)
  // 3. User is logged in but their role is still being fetched (loadingRole)
  if (loadingAuth || isAuthTransitioning || (user && loadingRole)) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner"></div>
        <p style={{ color: '#a8dadc', fontSize: '1.2em' }}>
          {isAuthTransitioning ? 'Processing authentication...' :
           (user && loadingRole ? 'Fetching user profile...' : 'Loading application...')
          }
        </p>
      </div>
    );
  }

  // Once authentication state and role are known, and not admin (which redirects externally),
  // conditionally render the Checklist or AuthPage.
  return (
    <div className="app">
      {user ? (
        // Only render Checklist if user is logged in AND their role is 'user'
        userRole === 'user' ? ( // Explicitly check for 'user' role
            <Checklist user={user} />
        ) : null // If userRole is admin, redirection already happened, so render nothing here.
                 // If userRole is null (e.g., error fetching role), loading state handles.
      ) : (
        <AuthPage
          onLoginSuccess={() => { /* Firebase listener handles state update */ }}
          onAuthActionStart={handleAuthActionStart}
          onAuthActionComplete={handleAuthActionComplete}
        />
      )}
    </div>
  );
};

export default App;
