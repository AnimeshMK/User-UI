// src/Component/AuthPage.jsx (FINAL - Saves User Data to Firestore on Registration)
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
// *** IMPORTANT: Add Firestore imports here ***
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // *** IMPORTANT: Make sure db is imported ***
import '../App.css';

// Accept both onAuthActionStart and onAuthActionComplete props
const AuthPage = ({ onLoginSuccess, onAuthActionStart, onAuthActionComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Local loading for form disable
  const [loginRole, setLoginRole] = useState('user');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true); // Disable form button

    // Inform App.jsx that an auth action has started
    if (onAuthActionStart) {
      onAuthActionStart(); // This will make App.jsx show the global loading screen
    }

    try {
      if (isLogin) {
        // --- Login Logic ---
        await signInWithEmailAndPassword(auth, email, password);
        console.log(`User logged in as ${loginRole} successfully!`);
        onLoginSuccess(); // This will trigger App.jsx's onAuthStateChanged
        // App.jsx's onAuthStateChanged will then set isAuthTransitioning to false,
        // so no need to call onAuthActionComplete here directly for successful login.
      } else {
        // --- Registration Logic ---
        if (password !== confirmPassword) {
          setError('The passwords you entered do not match. Please try again.');
          setLoading(false);
          if (onAuthActionComplete) onAuthActionComplete(); // Dismiss global loading on local validation fail
          return;
        }

        if (mobileNumber && !/^\d{10,15}$/.test(mobileNumber)) {
          setError('Please enter a valid mobile number (10 to 15 digits, numbers only).');
          setLoading(false);
          if (onAuthActionComplete) onAuthActionComplete(); // Dismiss global loading on local validation fail
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (fullName) {
          await updateProfile(user, {
            displayName: fullName,
          });
          console.log('User display name updated:', fullName);
        }

        // **** CRUCIAL ADDITION: Save user's role and profile data to Firestore ****
        // This creates a document in the 'users' collection with the user's UID as its ID.
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          email: user.email,
          fullName: fullName,
          displayName: fullName,
          lists: [],
          tasks: [],
          mobileNumber: mobileNumber,
          role: 'user', // Default role for self-registered users
          createdAt: serverTimestamp(), // Use Firestore's server timestamp
        });
        console.log('User profile saved to Firestore with role "user".');

        console.log('User registered successfully!', user);

        // Immediately sign out after registration to ensure App.jsx detects no active user.
        await signOut(auth);

        // After signOut, Firebase's onAuthStateChanged in App.jsx will be triggered for null user.
        // App.jsx's listener will then handle setting isAuthTransitioning to false.
        // So, we only need to update AuthPage's local state for the next render.
        setIsLogin(true); // Switch AuthPage to Login view
        setEmail('');
        setPassword('');
        setFullName('');
        setMobileNumber('');
        setConfirmPassword('');
        setError('Registration successful! Please log in with your new account.'); // Inform user

        setLoading(false); // Local loading can be stopped now
        // No explicit onAuthActionComplete needed here as onAuthStateChanged in App.jsx handles it after signOut
      }
    } catch (err) {
      console.error('Authentication error:', err.message);
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid. Please check the format.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Your account has been disabled. Please contact support.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email. Please register or check your email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'The password you entered is incorrect. Please try again.';
            break;
          case 'auth/invalid-credential':
             errorMessage = 'Invalid email or password. Please double-check your credentials.';
             break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please login or use a different email.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password (at least 6 characters).';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = `Error: ${err.message}`;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false); // Ensure local form loading is always turned off
      // If an error occurred, explicitly signal completion to App.jsx.
      // App.jsx's onAuthStateChanged won't necessarily fire on an error if no state change happens.
      if (error && onAuthActionComplete) {
          onAuthActionComplete(); // This will dismiss the global loading screen
      }
      // If it's a successful login, onAuthStateChanged in App.jsx handles setting isAuthTransitioning to false.
      // If it's a successful registration, onAuthStateChanged also handles it after the signOut.
    }
  };

  const handleSwitchMode = () => {
    setIsLogin(prev => !prev);
    setError(''); // Clear errors when switching modes
    setEmail(''); // Clear form fields when switching
    setPassword('');
    setFullName('');
    setMobileNumber('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-container">
      <div className={`auth-form-card ${loginRole === 'admin' ? 'admin-mode' : ''}`}>
        <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>

        {/* User/Admin Role Switcher */}
        {isLogin && ( // Only show role switch on login page
            <div className="login-role-switch">
                <button
                    type="button"
                    className={`role-button ${loginRole === 'user' ? 'active' : ''}`}
                    onClick={() => setLoginRole('user')}
                >
                    User
                </button>
                <button
                    type="button"
                    className={`role-button ${loginRole === 'admin' ? 'active' : ''}`}
                    onClick={() => setLoginRole('admin')}
                >
                    Admin
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name field (only for registration) */}
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                placeholder="Your Name"
              />
            </div>
          )}

          {/* Email field (for both login and registration) */}
          <div className="form-group">
            <label htmlFor="email">Email ID</label>
            <input
              type="email"
              id="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
            />
          </div>

          {/* Mobile No field (only for registration) */}
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="mobileNo">Mobile No.</label>
              <input
                type="tel"
                id="mobileNo"
                className="auth-input"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required={!isLogin}
                placeholder="e.g., +1234567890 (optional)"
              />
            </div>
          )}

          {/* Password field (for both login and registration) */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 6 characters"
            />
          </div>

          {/* Confirm Password field (only for registration) */}
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                placeholder="Re-enter password"
              />
            </div>
          )}

          {error && <p className="auth-error-message">{error}</p>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-switch-link">
          {isLogin ? (
            <p>Don't have an account? <span onClick={handleSwitchMode}>Register here.</span></p>
          ) : (
            <p>Already have an account? <span onClick={handleSwitchMode}>Login here.</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
