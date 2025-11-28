import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Collections from './pages/CollectionsNew';

function App() {
  return (
    <Router basename={process.env.NODE_ENV === 'production' ? '/alt_bags' : '/'}>
      <Routes>
        <Route path="/" element={<Collections />} />
      </Routes>
    </Router>
  );
}

export default App;
