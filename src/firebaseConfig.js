// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import getFirestore

const firebaseConfig = {
  apiKey: "AIzaSyD_n6KUrza1DcU4EdGZXaULe9dPEWU2X_E",
  authDomain: "taskmanager-46530.firebaseapp.com",
  projectId: "taskmanager-46530",
  storageBucket: "taskmanager-46530.firebasestorage.app",
  messagingSenderId: "1082531073522",
  appId: "1:1082531073522:web:4acaa2d69cfb3534b76f6b",
  measurementId: "G-XB9GHG37T9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { auth, db }; // Export both auth and db