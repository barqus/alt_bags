import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

function GymBagModel() {
  const gltf = useLoader(GLTFLoader, '/models/test_bag_2.glb');
  const modelRef = useRef<THREE.Group>(null);
  const lastScrollY = useRef(0);
  const totalRotation = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (modelRef.current) {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY.current;
        
        // Accumulate rotation based on scroll delta (infinite rotation)
        totalRotation.current += scrollDelta * 0.01; // Adjust 0.01 to control rotation speed
        
        // Apply infinite rotation
        modelRef.current.rotation.y = totalRotation.current;
        
        // Update last scroll position
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <ambientLight intensity={3.5} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} />
      <spotLight position={[-10, 10, -10]} angle={0.3} penumbra={1} intensity={2} />
      <directionalLight position={[5, 5, 5]} intensity={3.5} />
      <primitive 
        ref={modelRef}
        object={gltf.scene} 
        scale={12} 
        position={[0.2, -1.5, 0]}
      />
      {/* <OrbitControls /> */}
    </>
  );
}

const GymBag3D: React.FC = () => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 1 }}>
    <Canvas>
      <Suspense fallback={<Loader />}>
        <GymBagModel />
      </Suspense>
    </Canvas>
  </div>
);

export default GymBag3D; 