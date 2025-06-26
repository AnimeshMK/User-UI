// src/main.jsx (UPDATED CONTENT)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Import the new App component
import './index.css'; // Assuming you have a global index.css if needed

// Find the root DOM element where your React app will be mounted
const rootElement = document.getElementById('root');

// Create a React root and render the App component
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);