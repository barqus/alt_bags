import React, { useState, useEffect, Suspense } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import '../App.css';
import laced1 from '../resources/laced/laced_1.jpg';
import laced2 from '../resources/laced/laced_2.webp';
import laced3 from '../resources/laced/laced_3.webp';
import laced4 from '../resources/laced/laced_4.webp';

// 3D Alt Logo Component
function AltLogo3D() {
  const gltf = useLoader(GLTFLoader, '/models/alt_logo_3d.glb');
  const logoRef = React.useRef<THREE.Group>(null);
  
  const clonedScene = React.useMemo(() => gltf.scene.clone(), [gltf.scene]);

  useFrame((state) => {
    if (logoRef.current) {
      // Random multi-axis rotation with varying speeds (slowed down by half)
      logoRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.115) * 0.4;
      logoRef.current.rotation.y = state.clock.elapsedTime * 0.175 + Math.cos(state.clock.elapsedTime * 0.085) * 0.3;
      logoRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.095) * 0.25;
    }
  });

  return (
    <group ref={logoRef}>
      <primitive object={clonedScene} scale={28.0} />
      {/* Add extra lights around the logo to brighten it */}
      <pointLight position={[0, 0, 0]} intensity={3} distance={50} color="#ffffff" />
      <pointLight position={[5, 5, 5]} intensity={2} distance={30} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={2} distance={30} color="#ffffff" />
    </group>
  );
}

// Orbit Ring Component
function OrbitRing({ 
  radiusX, 
  radiusZ, 
  tiltX, 
  tiltZ,
  rotationSpeed
}: { 
  radiusX: number; 
  radiusZ: number; 
  tiltX: number; 
  tiltZ: number;
  rotationSpeed: { x: number; y: number; z: number };
}) {
  const points = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 128;
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * radiusX,
          0,
          Math.sin(angle) * radiusZ
        )
      );
    }
    return pts;
  }, [radiusX, radiusZ]);
  
  const lineRef = React.useRef<THREE.LineLoop>(null);
  const groupRef = React.useRef<THREE.Group>(null);
  
  React.useEffect(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  }, [points]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Asymmetric rotation of the orbit itself
      groupRef.current.rotation.x = tiltX + Math.sin(state.clock.elapsedTime * rotationSpeed.x) * 0.3;
      groupRef.current.rotation.y += rotationSpeed.y;
      groupRef.current.rotation.z = tiltZ + Math.cos(state.clock.elapsedTime * rotationSpeed.z) * 0.2;
    }
  });
  
  return (
    <group ref={groupRef}>
      <lineLoop ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial 
          color="#eb4b29" 
          transparent 
          opacity={0.6} 
          linewidth={4}
          dashSize={2}
          gapSize={1}
        />
      </lineLoop>
    </group>
  );
}

// Inspection Bag Component for Popup
function InspectionBag({ bagId }: { bagId: number }) {
  const gltf = useLoader(GLTFLoader, '/models/test_bag_2.glb');
  const bagRef = React.useRef<THREE.Group>(null);
  
  const clonedScene = React.useMemo(() => gltf.scene.clone(), [gltf.scene]);

  React.useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const newMaterial = new THREE.MeshStandardMaterial({
            color: '#8B7355',
            metalness: 0.3,
            roughness: 0.7,
          });
          mesh.material = newMaterial;
        }
      }
    });
  }, [clonedScene]);

  useFrame((state) => {
    if (bagRef.current) {
      // Slow rotation for inspection
      bagRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={bagRef}>
      <primitive object={clonedScene} scale={12} />
    </group>
  );
}

// Orbiting Bag Component
function OrbitingBag({ 
  bagId,
  radiusX,
  radiusZ,
  orbitSpeed, 
  selfRotationSpeed, 
  startAngle, 
  tiltOffset,
  orbitTiltX,
  orbitTiltZ,
  onPointerEnter,
  onPointerLeave,
  onClick,
  isPaused
}: { 
  bagId: number;
  radiusX: number;
  radiusZ: number;
  orbitSpeed: number; 
  selfRotationSpeed: { x: number; y: number; z: number };
  startAngle: number; 
  tiltOffset: number;
  orbitTiltX: number;
  orbitTiltZ: number;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: (bagId: number, event: any) => void;
  isPaused: boolean;
}) {
  const gltf = useLoader(GLTFLoader, '/models/test_bag_2.glb');
  const bagRef = React.useRef<THREE.Group>(null);
  const orbitRef = React.useRef<THREE.Group>(null);
  const pausedTimeRef = React.useRef<number>(0);
  const timeOffsetRef = React.useRef<number>(0);
  
  const clonedScene = React.useMemo(() => gltf.scene.clone(), [gltf.scene]);

  React.useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const newMaterial = new THREE.MeshStandardMaterial({
            color: '#8B7355',
            metalness: 0.3,
            roughness: 0.7,
          });
          mesh.material = newMaterial;
        }
      }
    });
  }, [clonedScene]);

  useFrame((state) => {
    if (bagRef.current && orbitRef.current) {
      if (isPaused) {
        // Store the time when paused
        if (pausedTimeRef.current === 0) {
          pausedTimeRef.current = state.clock.elapsedTime;
        }
        return;
      } else {
        // Calculate time offset when unpausing
        if (pausedTimeRef.current !== 0) {
          timeOffsetRef.current += state.clock.elapsedTime - pausedTimeRef.current;
          pausedTimeRef.current = 0;
        }
      }
      
      const adjustedTime = state.clock.elapsedTime - timeOffsetRef.current;
      const angle = adjustedTime * orbitSpeed + startAngle;
      
      // Elliptical orbit with tilted plane
      orbitRef.current.rotation.x = orbitTiltX;
      orbitRef.current.rotation.z = orbitTiltZ;
      
      bagRef.current.position.x = Math.cos(angle) * radiusX;
      bagRef.current.position.z = Math.sin(angle) * radiusZ;
      bagRef.current.position.y = Math.sin(angle * 2 + tiltOffset) * 1.5;
      
      // Self-rotation only around Y axis with individual speeds
      bagRef.current.rotation.x = 0;
      bagRef.current.rotation.y = adjustedTime * selfRotationSpeed.y;
      bagRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={orbitRef}>
      <group 
        ref={bagRef}
        onPointerEnter={(e) => {
    e.stopPropagation();
          onPointerEnter();
        }}
        onPointerLeave={(e) => {
    e.stopPropagation();
          onPointerLeave();
        }}
        onClick={(e) => {
    e.stopPropagation();
          onClick(bagId, e);
        }}
      >
        <primitive object={clonedScene} scale={15} />
      </group>
    </group>
  );
}

// Main Scene Component
function OrbitScene({ 
  rotation,
  onBagPointerEnter,
  onBagPointerLeave,
  onBagClick,
  isPaused
}: { 
  rotation: { x: number; y: number };
  onBagPointerEnter: () => void;
  onBagPointerLeave: () => void;
  onBagClick: (bagId: number, event: any) => void;
  isPaused: boolean;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = rotation.x;
      groupRef.current.rotation.y = rotation.y;
    }
  });
  
  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.5} />
      
      {/* Orbit Rings - Elliptical with different tilts and asymmetric movement */}
      <OrbitRing 
        radiusX={12} 
        radiusZ={15} 
        tiltX={0.2} 
        tiltZ={0.1} 
        rotationSpeed={{ x: 0.15, y: 0.002, z: 0.18 }}
      />
      <OrbitRing 
        radiusX={16} 
        radiusZ={20} 
        tiltX={-0.3} 
        tiltZ={0.25} 
        rotationSpeed={{ x: 0.12, y: -0.0015, z: 0.14 }}
      />
      <OrbitRing 
        radiusX={20} 
        radiusZ={26} 
        tiltX={0.15} 
        tiltZ={-0.2} 
        rotationSpeed={{ x: 0.1, y: 0.001, z: 0.11 }}
      />
      
      {/* Center 3D Logo */}
      <AltLogo3D />
      
      {/* Three Orbiting Bags with different orbit speeds and self-rotation speeds */}
      <OrbitingBag 
        bagId={1}
        radiusX={12}
        radiusZ={15}
        orbitSpeed={0.15} 
        selfRotationSpeed={{ x: 0, y: -0.3, z: 0 }}
        startAngle={0} 
        tiltOffset={0}
        orbitTiltX={0.2}
        orbitTiltZ={0.1}
        onPointerEnter={onBagPointerEnter}
        onPointerLeave={onBagPointerLeave}
        onClick={onBagClick}
        isPaused={isPaused}
      />
      <OrbitingBag 
        bagId={2}
        radiusX={16}
        radiusZ={20}
        orbitSpeed={0.12} 
        selfRotationSpeed={{ x: 0, y: 0.5, z: 0 }}
        startAngle={Math.PI * 0.66} 
        tiltOffset={Math.PI * 0.5}
        orbitTiltX={-0.3}
        orbitTiltZ={0.25}
        onPointerEnter={onBagPointerEnter}
        onPointerLeave={onBagPointerLeave}
        onClick={onBagClick}
        isPaused={isPaused}
      />
      <OrbitingBag 
        bagId={3}
        radiusX={20}
        radiusZ={26}
        orbitSpeed={0.09} 
        selfRotationSpeed={{ x: 0, y: -0.2, z: 0 }}
        startAngle={Math.PI * 1.33} 
        tiltOffset={Math.PI}
        orbitTiltX={0.15}
        orbitTiltZ={-0.2}
        onPointerEnter={onBagPointerEnter}
        onPointerLeave={onBagPointerLeave}
        onClick={onBagClick}
        isPaused={isPaused}
      />
    </group>
  );
}

function Collections() {
  const [system3DRotation, setSystem3DRotation] = useState({ x: 0, y: 0 });
  const [isDraggingSystem, setIsDraggingSystem] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isHoveringBag, setIsHoveringBag] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBag, setSelectedBag] = useState<number | null>(null);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [modalAnimating, setModalAnimating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const isHoveringBagRef = React.useRef(false);
  
  const productImages = [laced1, laced2, laced3, laced4, '3d'] as const;
  
  const handleSystemMouseDown = (e: React.MouseEvent) => {
    if (isPaused) {
      // If paused, unpause on click
      setIsPaused(false);
      return;
    }
    if (isHoveringBagRef.current) return; // Don't start dragging if hovering over a bag
    setIsDraggingSystem(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };
  
  const handleSystemMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for crosshair
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (!isDraggingSystem || isPaused) return;
    
    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;
    
    setSystem3DRotation({
      x: system3DRotation.x - deltaY * 0.01,
      y: system3DRotation.y + deltaX * 0.01,
    });
    
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };
  
  const handleSystemMouseUp = () => {
    setIsDraggingSystem(false);
  };
  
  const handleBagPointerEnter = () => {
    isHoveringBagRef.current = true;
    setIsHoveringBag(true);
  };
  
  const handleBagPointerLeave = () => {
    isHoveringBagRef.current = false;
    setIsHoveringBag(false);
  };
  
  const handleBagClick = (bagId: number, event: any) => {
    setIsPaused(true);
    setIsDraggingSystem(false);
    setClickPosition({ x: mousePos.x, y: mousePos.y });
    setModalAnimating(true);
    setSelectedBag(bagId);
    setSelectedImage(0); // Reset to first image
    
    // Trigger animation
    setTimeout(() => {
      setModalAnimating(false);
    }, 50);
  };
  
  const handleClosePopup = () => {
    setSelectedBag(null);
    setIsPaused(false);
    setSelectedImage(0); // Reset to first image
  };
  
  return (
          <div 
      className="xp-desktop" 
            style={{
        background: '#88b4d7', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden', 
        cursor: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 40], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        onPointerDown={(e) => {
          if (!isHoveringBagRef.current) {
            handleSystemMouseDown(e as any);
          }
        }}
        onPointerMove={(e) => {
          handleSystemMouseMove(e as any);
        }}
        onPointerUp={handleSystemMouseUp}
        onPointerLeave={handleSystemMouseUp}
      >
        <Suspense fallback={null}>
          <OrbitScene 
            rotation={system3DRotation}
            onBagPointerEnter={handleBagPointerEnter}
            onBagPointerLeave={handleBagPointerLeave}
            onBagClick={handleBagClick}
            isPaused={isPaused}
          />
        </Suspense>
      </Canvas>
      
      {/* Space Game Crosshair */}
      {/* Vertical lines from top/bottom to center square */}
      <div
              style={{
          position: 'fixed',
          left: mousePos.x,
          top: 0,
          width: '1px',
          height: `${mousePos.y - 20}px`,
          backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: mousePos.x,
          top: `${mousePos.y + 20}px`,
          width: '1px',
          height: `calc(100vh - ${mousePos.y + 20}px)`,
          backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      
      {/* Horizontal lines from left/right to center square */}
      <div
                  style={{
          position: 'fixed',
          left: 0,
          top: mousePos.y,
          width: `${mousePos.x - 20}px`,
          height: '1px',
          backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: `${mousePos.x + 20}px`,
          top: mousePos.y,
          width: `calc(100vw - ${mousePos.x + 20}px)`,
          height: '1px',
          backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      
      {/* Center crosshair with corners */}
      <div
              style={{
          position: 'fixed',
          left: mousePos.x,
          top: mousePos.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        
        {/* Corner brackets */}
        {/* Top-left */}
        <div
              style={{
                position: 'absolute',
            left: '-8px',
            top: '-8px',
            width: '6px',
            height: '1px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-8px',
            top: '-8px',
            width: '1px',
            height: '6px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        
        {/* Top-right */}
        <div
                style={{
            position: 'absolute',
            right: '-8px',
            top: '-8px',
            width: '6px',
            height: '1px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-8px',
            top: '-8px',
            width: '1px',
            height: '6px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        
        {/* Bottom-left */}
        <div
              style={{
            position: 'absolute',
            left: '-8px',
            bottom: '-8px',
            width: '6px',
            height: '1px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-8px',
            bottom: '-8px',
            width: '1px',
            height: '6px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        
        {/* Bottom-right */}
        <div
              style={{
            position: 'absolute',
            right: '-8px',
            bottom: '-8px',
            width: '6px',
            height: '1px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-8px',
            bottom: '-8px',
            width: '1px',
            height: '6px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
          }}
        />
        
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '2px',
            height: '2px',
            backgroundColor: isPaused ? '#ff0000' : (isHoveringBag ? '#eb4b29' : '#ffffff'),
            transform: 'translate(-50%, -50%)',
          }}
        />
              </div>

      {/* Modal Overlay */}
      {selectedBag !== null && (
        <>
          {/* Invisible overlay to catch clicks outside modal */}
          <div
            onClick={handleClosePopup}
                style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 10000,
              cursor: 'pointer',
            }}
          />
          
          {/* Small square on the bag */}
          <div
            style={{
              position: 'fixed',
              top: clickPosition.y - 20,
              left: clickPosition.x - 20,
              width: '40px',
              height: '40px',
              border: '2px solid rgba(235, 75, 41, 0.8)',
              zIndex: 9999,
              pointerEvents: 'none',
              opacity: modalAnimating ? 0 : 1,
              transition: 'opacity 0.5s ease',
            }}
          />
          
          {/* Connecting shape from small square to modal */}
          <svg
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              pointerEvents: 'none',
              opacity: modalAnimating ? 0 : 1,
              transition: 'opacity 0.5s ease',
            }}
          >
            {/* Filled orange polygon connecting small square to large modal */}
            <polygon
              points={
                clickPosition.x < window.innerWidth / 2
                  ? `
                    ${clickPosition.x - 20},${clickPosition.y - 20}
                    ${clickPosition.x + 20},${clickPosition.y - 20}
                    ${window.innerWidth / 2 + 1100},${window.innerHeight / 2 - 300}
                    ${window.innerWidth / 2 + 1100},${window.innerHeight / 2 + 300}
                    ${clickPosition.x + 20},${clickPosition.y + 20}
                    ${clickPosition.x - 20},${clickPosition.y + 20}
                    ${window.innerWidth / 2},${window.innerHeight / 2 + 300}
                    ${window.innerWidth / 2},${window.innerHeight / 2 - 300}
                  `
                  : `
                    ${clickPosition.x - 20},${clickPosition.y - 20}
                    ${clickPosition.x + 20},${clickPosition.y - 20}
                    ${window.innerWidth / 2},${window.innerHeight / 2 - 300}
                    ${window.innerWidth / 2},${window.innerHeight / 2 + 300}
                    ${clickPosition.x + 20},${clickPosition.y + 20}
                    ${clickPosition.x - 20},${clickPosition.y + 20}
                    ${window.innerWidth / 2 - 1100},${window.innerHeight / 2 + 300}
                    ${window.innerWidth / 2 - 1100},${window.innerHeight / 2 - 300}
                  `
              }
              fill="rgba(235, 75, 41, 0.1)"
              stroke="rgba(235, 75, 41, 0.5)"
              strokeWidth="1"
            />
          </svg>
          
          {/* White modal with product info */}
          <div
            onClick={(e) => e.stopPropagation()}
              style={{
              position: 'fixed',
              top: modalAnimating ? `${clickPosition.y}px` : '50%',
              left: modalAnimating 
                ? `${clickPosition.x}px`
                : clickPosition.x < window.innerWidth / 2 
                  ? `${window.innerWidth / 2}px`
                  : `${window.innerWidth / 2 - 1100}px`,
              transform: modalAnimating 
                ? 'translate(-50%, -50%) scale(0.1)' 
                : 'translate(0, -50%) scale(1)',
              width: '1100px',
              height: '600px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: 'white',
              border: '2px solid rgba(235, 75, 41, 0.6)',
              zIndex: 10001,
              overflow: 'auto',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              opacity: modalAnimating ? 0 : 1,
              padding: 0,
              boxSizing: 'border-box',
              display: 'flex',
            }}
          >
            {/* Left side - Product Images */}
            <div style={{
              width: '50%',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              height: '100%',
              overflowY: 'auto',
            }}>
              {/* Main image display */}
              <div style={{
                width: '100%',
                aspectRatio: '1',
                overflow: 'hidden',
                backgroundColor: '#f8f8f8',
              }}>
                {productImages[selectedImage] === '3d' ? (
                  <Canvas
                    camera={{ position: [0, 0, 30], fov: 50 }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[10, 10, 5]} intensity={1.5} />
                    <directionalLight position={[-10, -10, -5]} intensity={0.8} />
                    <pointLight position={[0, 0, 10]} intensity={1} color="#eb4b29" />
                    <Suspense fallback={null}>
                      <InspectionBag bagId={selectedBag || 1} />
                    </Suspense>
                  </Canvas>
                ) : (
                  <img 
                    src={productImages[selectedImage] as string} 
                    alt={`Laced bag view ${selectedImage + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>
              
              {/* Thumbnail grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '10px',
              }}>
                {productImages.map((img, index) => (
                  img === '3d' ? (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(index)}
              style={{
                        width: '100%',
                        aspectRatio: '1',
                        cursor: 'pointer',
                        border: selectedImage === index ? '2px solid #eb4b29' : '2px solid transparent',
                        opacity: selectedImage === index ? 1 : 0.6,
                        transition: 'all 0.3s',
                        backgroundColor: '#f8f8f8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '300',
                        color: '#666',
                      }}
                    >
                      3D
                </div>
                  ) : (
                    <img 
                      key={index}
                      src={img as string} 
                      alt={`Laced bag thumbnail ${index + 1}`}
                      onClick={() => setSelectedImage(index)}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: selectedImage === index ? '2px solid #eb4b29' : '2px solid transparent',
                        opacity: selectedImage === index ? 1 : 0.6,
                        transition: 'all 0.3s',
                      }}
                    />
                  )
                ))}
                </div>
              </div>

            {/* Right side - Product Details */}
                <div style={{
              width: '50%',
              padding: '40px',
                  height: '100%',
              overflowY: 'auto',
                  display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Product Title */}
              <h1 style={{
                fontSize: '36px',
                fontWeight: '300',
                marginBottom: '20px',
                color: '#000',
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '1px',
              }}>
                ✦ laced [zebra]
              </h1>
              
              {/* Price */}
              <div style={{
                fontSize: '28px',
                color: '#000',
                marginBottom: '15px',
                fontWeight: '400',
              }}>
                90,00 €
              </div>

              {/* Stock Status */}
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '30px',
                fontWeight: '400',
              }}>
                In stock
              </div>

              {/* Quantity and Add to Cart */}
              <div style={{
                marginBottom: '40px',
                paddingBottom: '40px',
                borderBottom: '1px solid #eee',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '20px',
                }}>
                  <input 
                    type="number" 
                    defaultValue={1}
                    min={1}
              style={{
                      width: '60px',
                      padding: '10px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      textAlign: 'center',
                    }}
                  />
                  </div>
                <button style={{
                  width: '100%',
                  padding: '15px 30px',
                  backgroundColor: '#000',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'background-color 0.3s',
                }}>
                  Add to cart
                      </button>
                </div>

              {/* Description Section */}
              <div style={{
                marginBottom: '30px',
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.8',
                  marginBottom: '15px',
                }}>
                  ✦ limited design in zebra print
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.8',
                }}>
                  the bag is, in fact, laced. reversible design. pocket inside. o ring clasp 'alt.9734' stitching all over the handle. laces on the sides
                </p>
                  </div>

              {/* Details Section */}
              <div>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: '#000',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Details
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.8',
                }}>
                  made from deadstock and scraps, laced with corset ribbon from a vintage gown. repurposed satin lining
                    </p>
                  </div>
                  </div>
                      </div>
                </>
              )}
      </div>
  );
}

export default Collections;
