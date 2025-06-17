import React from 'react';
import './App.css';
import GymBag3D from './GymBag3D';

function App() {
  // Generate empty content sections for infinite scrolling
  const generateContentSection = (sectionNumber: number) => (
    <div key={sectionNumber} style={{ 
      height: '100vh', 
      background: 'transparent'
    }}>
    </div>
  );

  // Create many sections for infinite scrolling effect
  const contentSections = Array.from({ length: 50 }, (_, i) => generateContentSection(i + 1));

  return (
    <div className="App">
      {/* <nav style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Alt Bag
        </div>
        <div style={{
          display: 'flex',
          gap: '30px',
          alignItems: 'center'
        }}>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'color 0.3s ease'
          }}>
            Home
          </a>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'color 0.3s ease'
          }}>
            Products
          </a>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'color 0.3s ease'
          }}>
            About
          </a>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'color 0.3s ease'
          }}>
            Contact
          </a>
        </div>
      </nav> */}

      <GymBag3D />
      <div style={{ position: 'relative', zIndex: 0 }}>
        {contentSections}
      </div>
    </div>
  );
}

export default App;
