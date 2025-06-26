// src/Component/AccountModal.jsx (NEW FILE)

import React, { useState } from 'react';
import { X, User, LogOut, Trash2, AlertCircle } from 'lucide-react';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'; // Import for re-authentication
import { auth } from '../firebaseConfig'; // Import Firebase auth instance
import '../App.css'; // For modal styling

const AccountModal = ({ user, onClose, onSignOut }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    if (!user) {
      setDeleteError('No user logged in.');
      return;
    }

    setLoadingDelete(true);
    setDeleteError('');

    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      await deleteUser(user);
      console.log('User account deleted successfully!');
      onClose(); 
    } catch (error) {
      console.error('Error deleting account:', error);
      let errorMessage = 'Failed to delete account. Please try again.';

      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'This operation requires recent authentication. Please re-enter your password and try again.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
          errorMessage = 'Incorrect password. Please try again.';
      }
      else {
        errorMessage = `Error: ${error.message}`;
      }
      setDeleteError(errorMessage);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content account-modal-content">
        <div className="modal-header">
          <h2><User size={24} /> My Account</h2>
          <button onClick={onClose} className="close-modal-btn">
            <X size={24} />
          </button>
        </div>

        <div className="account-info-section">
            {user.displayName && <p><strong>User Name:</strong> {user.displayName}</p>}
          <p><strong>Email:</strong> {user.email}</p>
          <p className="user-id-display"><strong>User ID:</strong> {user.uid}</p> {/* Display User ID */}
        </div>

        <div className="account-actions">
          {/* Sign Out Button */}
          <button onClick={onSignOut} className="action-button sign-out-button">
            <LogOut size={18} /> Sign Out
          </button>

          {/* Delete Account Button */}
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="action-button delete-button"
            >
              <Trash2 size={18} /> Delete Account
            </button>
          ) : (
            <div className="confirm-delete-section">
              <p className="delete-warning"><AlertCircle size={18} /> This action is irreversible. Please confirm by re-entering your password:</p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="auth-input" // Reuse auth-input styling
                disabled={loadingDelete}
              />
              {deleteError && <p className="delete-error-message">{deleteError}</p>}
              <div className="confirm-delete-buttons">
                <button
                  onClick={handleDeleteAccount}
                  className="action-button confirm-delete-button"
                  disabled={loadingDelete || !deletePassword}
                >
                  {loadingDelete ? 'Deleting...' : 'Confirm Deletion'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="action-button cancel-delete-button"
                  disabled={loadingDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountModal;