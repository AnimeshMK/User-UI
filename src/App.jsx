// src/App.jsx

import React from 'react';
import Checklist from './Component/Checklist'; // Import the new combined component
import './App.css'; // Keep your main App.css here

function App() {
  return (
    // Your main App structure, which now just renders the Checklist
    <Checklist />
  );
}

export default App;