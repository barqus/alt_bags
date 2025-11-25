import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Collections from './pages/CollectionsNew';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Collections />} />
      </Routes>
    </Router>
  );
}

export default App;
