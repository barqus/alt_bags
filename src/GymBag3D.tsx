import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import altLogo from './alt_logo.png';

interface Collection {
  id: number;
  name: string;
  bagCount: number;
  bagColor: string;
  description: string;
  material: string;
  dimensions: string;
  price: string;
  shopUrl: string;
}

interface GymBag3DProps {
  collection: Collection;
  currentBagIndex: number;
  onBagClick: (bagIndex: number) => void;
}

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

function SingleBagModel({ 
  bagIndex, 
  isActiveBag,
  isActiveCollection,
  onClick,
  bagColor
}: { 
  bagIndex: number; 
  isActiveBag: boolean;
  isActiveCollection: boolean;
  onClick?: () => void;
  bagColor: string;
}) {
  const gltf = useLoader(GLTFLoader, '/models/test_bag_2.glb');
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const lastScrollY = useRef(0);
  const totalRotationY = useRef(0);
  const rotationX = useRef(0);
  const rotationZ = useRef(0);
  const [hovered, setHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const clonedScene = React.useMemo(() => gltf.scene.clone(), [gltf.scene]);

  // Use the bag color from props
  const currentColor = React.useMemo(() => new THREE.Color(bagColor), [bagColor]);

  // Apply colors to all meshes in the cloned model with enhanced material properties
  React.useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.clickable = true;
        child.castShadow = true;
        child.receiveShadow = true;
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          // Clone the material if it's shared
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => {
              const newMat = mat.clone() as THREE.MeshStandardMaterial;
              newMat.color.copy(currentColor);
              newMat.metalness = 0.3;
              newMat.roughness = 0.7;
              newMat.envMapIntensity = 1;
              return newMat;
            });
          } else {
            const newMaterial = (mesh.material as THREE.MeshStandardMaterial).clone();
            newMaterial.color.copy(currentColor);
            newMaterial.metalness = 0.3;
            newMaterial.roughness = 0.7;
            newMaterial.envMapIntensity = 1;
            mesh.material = newMaterial;
          }
        }
      }
    });
  }, [clonedScene, currentColor]);

  // Handle scroll rotation (Y axis)
  useEffect(() => {
    const handleScroll = () => {
      if (modelRef.current && isActiveBag && isActiveCollection && !isDragging) {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY.current;
        
        // Accumulate rotation based on scroll delta (infinite rotation)
        totalRotationY.current += scrollDelta * 0.01;
        
        // Update last scroll position
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isActiveBag, isActiveCollection, isDragging]);

  // Handle mouse drag rotation (all axes)
  useEffect(() => {
    if (!isActiveBag || !isActiveCollection) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target instanceof HTMLCanvasElement) {
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && modelRef.current) {
        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;
        
        // Rotate based on mouse movement
        totalRotationY.current += deltaX * 0.01;
        rotationX.current -= deltaY * 0.01;
        
        // Clamp X rotation to prevent flipping
        rotationX.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX.current));
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'auto';
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActiveBag, isActiveCollection, isDragging]);

  // Apply rotation every frame
  useFrame(() => {
    if (modelRef.current && isActiveBag && isActiveCollection) {
      modelRef.current.rotation.y = totalRotationY.current;
      modelRef.current.rotation.x = rotationX.current;
    }
  });

  // Scale based on active state and hover (only if collection is active)
  useFrame(() => {
    if (groupRef.current) {
      let targetScale = 1;
      
      if (isActiveCollection) {
        if (isActiveBag) {
          // Active bag is significantly larger
          targetScale = 1.5;
        } else if (hovered) {
          // Hovered non-active bag is medium sized
          targetScale = 0.65;
        } else {
          // Non-active bags are much smaller
          targetScale = 0.45;
        }
      } else {
        // Bags in non-active collections are also smaller
        targetScale = 0.45;
      }
      
      const currentScale = groupRef.current.scale.x;
      const diff = targetScale - currentScale;
      
      // Smooth scale transition
      const newScale = currentScale + diff * 0.1;
      groupRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick && isActiveCollection && !isActiveBag) {
      onClick();
    }
  };

  return (
    <group 
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (isActiveCollection && !isActiveBag) setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <primitive 
        ref={modelRef}
        object={clonedScene} 
        scale={18} 
        position={[0.2, -1.5, 0]}
      />
    </group>
  );
}

// Carousel for bags within a collection
function BagCarousel({
  collection,
  currentBagIndex,
  onBagClick
}: {
  collection: Collection;
  currentBagIndex: number;
  onBagClick: (bagIndex: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const prevBagIndex = useRef(0);
  const continuousRotation = useRef(0);
  
  // Calculate continuous rotation for bags
  useEffect(() => {
    if (collection.bagCount === 0) return;
    
    const anglePerBag = (Math.PI * 2) / collection.bagCount;
    
    if (prevBagIndex.current === collection.bagCount - 1 && currentBagIndex === 0) {
      continuousRotation.current -= anglePerBag;
    } else if (prevBagIndex.current === 0 && currentBagIndex === collection.bagCount - 1) {
      continuousRotation.current += anglePerBag;
    } else {
      const diff = currentBagIndex - prevBagIndex.current;
      continuousRotation.current -= diff * anglePerBag;
    }
    
    prevBagIndex.current = currentBagIndex;
  }, [currentBagIndex, collection.bagCount]);

  // Smooth rotation animation for bags
  useFrame(() => {
    if (groupRef.current) {
      const current = groupRef.current.rotation.y;
      const target = continuousRotation.current;
      const diff = target - current;
      groupRef.current.rotation.y += diff * 0.1;
    }
  });

  // Position bags in a circle
  const bagRadius = 6;
  const bags = Array.from({ length: collection.bagCount }, (_, i) => {
    // Offset angle so bag 0 is at the front (toward negative Z in local space)
    const angle = (i * Math.PI * 2) / collection.bagCount + Math.PI;
    const x = Math.sin(angle) * bagRadius;
    const z = Math.cos(angle) * bagRadius;
    
    // Calculate rotation to face center of their circle
    const rotationY = angle + Math.PI;
    
    return (
      <group key={i} position={[x, 0, z]} rotation={[0, rotationY, 0]}>
        <SingleBagModel 
          bagIndex={i} 
          isActiveBag={i === currentBagIndex} 
          isActiveCollection={true}
          onClick={() => onBagClick(i)}
          bagColor={collection.bagColor}
        />
      </group>
    );
  });

  return (
    <group ref={groupRef}>
      {bags}
    </group>
  );
}

// Scene component with lighting and bag carousel
function Scene({
  collection,
  currentBagIndex,
  onBagClick
}: {
  collection: Collection;
  currentBagIndex: number;
  onBagClick: (bagIndex: number) => void;
}) {
  return (
    <>
      {/* Soft, natural lighting */}
      <ambientLight intensity={3.5} color="#ffffff" />
      <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={1.5} color="#fffaf5" />
      <hemisphereLight intensity={1} groundColor="#e8e8e0" color="#ffffff" />
      <pointLight position={[0, 5, 0]} intensity={0.8} color="#fffbf7" distance={30} />
      
      {/* Subtle rim lighting with warm tones */}
      <pointLight position={[15, 0, 0]} intensity={0.3} color="#8b7355" distance={40} />
      <pointLight position={[-15, 0, 0]} intensity={0.3} color="#8b7355" distance={40} />
      
      {/* Center Logo */}
      <Suspense fallback={null}>
        <CenterLogo />
      </Suspense>
      
      {/* Bag carousel */}
      <BagCarousel
        collection={collection}
        currentBagIndex={currentBagIndex}
        onBagClick={onBagClick}
      />
    </>
  );
}

// Center logo component
function CenterLogo() {
  const texture = useLoader(TextureLoader, altLogo);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Rotate to always face camera and add subtle float animation
  useFrame(({ camera, clock }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
      // Subtle floating animation
      const floatY = Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
      meshRef.current.position.set(0, floatY, -8);
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -8]}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true}
        side={THREE.DoubleSide}
        opacity={0.4}
      />
    </mesh>
  );
}

const GymBag3D: React.FC<GymBag3DProps> = ({ 
  collection, 
  currentBagIndex, 
  onBagClick 
}) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 1, background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%)' }}>
    <Canvas 
      camera={{ position: [0, 0, 25], fov: 50 }}
      shadows
      gl={{ 
        alpha: false, 
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
      }}
    >
      <color attach="background" args={['#f5f5f0']} />
      <Suspense fallback={<Loader />}>
        <Scene 
          collection={collection}
          currentBagIndex={currentBagIndex}
          onBagClick={onBagClick}
        />
      </Suspense>
    </Canvas>
  </div>
);

export default GymBag3D; 