import React, { useState, useEffect, Suspense } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import '../App.css';
import laced1 from '../resources/laced/laced_1.jpg';
import laced2 from '../resources/laced/laced_2.webp';
import laced3 from '../resources/laced/laced_3.webp';
import laced4 from '../resources/laced/laced_4.webp';

// Camera Controller for smooth orbit and zoom
function CameraController({ zoom, lookAtTarget, scrollZoomLevel }: { 
  zoom: number; 
  lookAtTarget: { x: number; y: number; z: number } | null;
  scrollZoomLevel: number;
}) {
  const { camera } = useThree();
  const currentAngles = React.useRef({ angleY: 0, angleX: 0, radius: 40 });
  const initialized = React.useRef(false);
  
  useFrame(() => {
    // Initialize angles from current camera position on first frame
    if (!initialized.current) {
      const currentRadius = Math.sqrt(
        camera.position.x * camera.position.x + 
        camera.position.y * camera.position.y + 
        camera.position.z * camera.position.z
      );
      currentAngles.current.angleY = Math.atan2(camera.position.x, camera.position.z);
      currentAngles.current.angleX = Math.atan2(camera.position.y, Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z));
      currentAngles.current.radius = currentRadius;
      initialized.current = true;
    }
    
    let targetAngleY, targetAngleX, targetRadius;
    
    if (lookAtTarget) {
      // Calculate the angle to orbit camera around center to face the bag
      targetAngleY = Math.atan2(lookAtTarget.x, lookAtTarget.z);
      targetAngleX = Math.atan2(lookAtTarget.y, Math.sqrt(lookAtTarget.x * lookAtTarget.x + lookAtTarget.z * lookAtTarget.z));
      // Apply scroll zoom level to the target radius when zoomed
      targetRadius = zoom * scrollZoomLevel;
    } else {
      // Default position when not looking at a bag
      targetAngleY = 0;
      targetAngleX = 0;
      targetRadius = zoom;
    }
    
    // Smoothly interpolate the angles and radius (not the position directly)
    // This ensures the camera orbits around instead of cutting through
    currentAngles.current.angleY += (targetAngleY - currentAngles.current.angleY) * 0.1;
    currentAngles.current.angleX += (targetAngleX - currentAngles.current.angleX) * 0.1;
    currentAngles.current.radius += (targetRadius - currentAngles.current.radius) * 0.1;
    
    // Calculate camera position from angles
    const radius = currentAngles.current.radius;
    camera.position.x = Math.sin(currentAngles.current.angleY) * Math.cos(currentAngles.current.angleX) * radius;
    camera.position.y = Math.sin(currentAngles.current.angleX) * radius;
    camera.position.z = Math.cos(currentAngles.current.angleY) * Math.cos(currentAngles.current.angleX) * radius;
    
    // Look at the bag if zoomed, otherwise look at center
    if (lookAtTarget) {
      camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
    } else {
      camera.lookAt(0, 0, 0);
    }
  });
  
  return null;
}

// 3D Alt Logo Component
function AltLogo3D({ isPaused }: { isPaused: boolean }) {
  const gltf = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/alt_logo_3d.glb`);
  const logoRef = React.useRef<THREE.Group>(null);
  const pausedTimeRef = React.useRef<number>(0);
  const timeOffsetRef = React.useRef<number>(0);
  
  const clonedScene = React.useMemo(() => {
    const scene = gltf.scene.clone();
    // Clone materials so the logo has independent material properties
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return scene;
  }, [gltf.scene]);

  useFrame((state) => {
    if (logoRef.current) {
      // Dim the logo when a bag is zoomed
      const targetOpacity = isPaused ? 0.3 : 1.0;
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.transparent = true;
            if (material.opacity === undefined) material.opacity = 1.0;
            material.opacity += (targetOpacity - material.opacity) * 0.1;
          }
        }
      });
      
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
      
      // Random multi-axis rotation with varying speeds (slowed down by half)
      logoRef.current.rotation.x = Math.sin(adjustedTime * 0.115) * 0.4;
      logoRef.current.rotation.y = adjustedTime * 0.175 + Math.cos(adjustedTime * 0.085) * 0.3;
      logoRef.current.rotation.z = Math.sin(adjustedTime * 0.095) * 0.25;
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
  rotationSpeed,
  isPaused
}: { 
  radiusX: number; 
  radiusZ: number; 
  tiltX: number; 
  tiltZ: number;
  rotationSpeed: { x: number; y: number; z: number };
  isPaused: boolean;
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
  const pausedTimeRef = React.useRef<number>(0);
  const timeOffsetRef = React.useRef<number>(0);
  
  React.useEffect(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  }, [points]);
  
  useFrame((state) => {
    if (groupRef.current && lineRef.current) {
      // Dim the orbit lines when a bag is zoomed
      const targetOpacity = isPaused ? 0.2 : 0.6;
      const material = lineRef.current.material as THREE.LineDashedMaterial;
      if (material.opacity !== undefined) {
        material.opacity += (targetOpacity - material.opacity) * 0.1;
      }
      
      // Set render order to render behind bags when zoomed
      if (lineRef.current) {
        lineRef.current.renderOrder = isPaused ? -1 : 0;
      }
      
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
      
      // Asymmetric rotation of the orbit itself
      groupRef.current.rotation.x = tiltX + Math.sin(adjustedTime * rotationSpeed.x) * 0.3;
      groupRef.current.rotation.y += rotationSpeed.y;
      groupRef.current.rotation.z = tiltZ + Math.cos(adjustedTime * rotationSpeed.z) * 0.2;
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
          depthWrite={false}
          depthTest={true}
        />
      </lineLoop>
    </group>
  );
}

// Inspection Bag Component for Popup
function InspectionBag({ bagId }: { bagId: number }) {
  const gltf = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/test_bag_2.glb`);
  const bagRef = React.useRef<THREE.Group>(null);
  
  const clonedScene = React.useMemo(() => {
    const scene = gltf.scene.clone();
    // Clone materials for independent material properties
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return scene;
  }, [gltf.scene]);

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
  isPaused,
  isHovered,
  isZoomed,
  isDragging,
  manualRotation,
  bagPositionsRef
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
  onPointerEnter: (bagId: number) => void;
  onPointerLeave: () => void;
  isPaused: boolean;
  isHovered: boolean;
  isZoomed: boolean;
  isDragging: boolean;
  manualRotation: { x: number; y: number };
  bagPositionsRef: React.MutableRefObject<{ [key: number]: { x: number; y: number; z: number } }>;
}) {
  const gltf = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/test_bag_2.glb`);
  const bagRef = React.useRef<THREE.Group>(null);
  const orbitRef = React.useRef<THREE.Group>(null);
  const scaleRef = React.useRef<number>(15);
  const pausedTimeRef = React.useRef<number>(0);
  const timeOffsetRef = React.useRef<number>(0);
  const targetRotation = React.useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  
  const clonedScene = React.useMemo(() => {
    const scene = gltf.scene.clone();
    // Clone materials so each bag has independent material properties
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return scene;
  }, [gltf.scene]);

  useFrame((state) => {
    if (bagRef.current && orbitRef.current) {
      // Always update bag position in ref for camera targeting
      const worldPosition = new THREE.Vector3();
      bagRef.current.getWorldPosition(worldPosition);
      bagPositionsRef.current[bagId] = {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
      };
      
      // Smoothly scale up when zoomed
      const targetScale = isZoomed ? 25 : 15; // Scale up to 25 when zoomed
      scaleRef.current += (targetScale - scaleRef.current) * 0.1;
      
      // Update opacity and render order - dim non-zoomed bags when any bag is zoomed
      const targetOpacity = isZoomed ? 1.0 : (isPaused ? 0.3 : 1.0);
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          // Set render order - zoomed bags render in front of orbit lines
          mesh.renderOrder = isZoomed ? 1 : 0;
          
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.transparent = true;
            // Initialize opacity if it doesn't exist
            if (material.opacity === undefined) {
              material.opacity = 1.0;
            }
            material.opacity += (targetOpacity - material.opacity) * 0.1;
          }
        }
      });
      
      // When zoomed, handle rotation
      if (isZoomed) {
        // Store the time when paused or hovered
        if (pausedTimeRef.current === 0) {
          pausedTimeRef.current = state.clock.elapsedTime;
        }
        
        if (isDragging) {
          // User is manually rotating - apply manual rotation on top of default orientation
          const bagAngleY = Math.atan2(worldPosition.x, worldPosition.z);
          const defaultOrientation = bagAngleY + Math.PI; // Face outward from center
          
          bagRef.current.rotation.x = manualRotation.x;
          bagRef.current.rotation.y = defaultOrientation + manualRotation.y;
          bagRef.current.rotation.z = 0;
        } else {
          // Calculate angle to face the camera
          const bagAngleY = Math.atan2(worldPosition.x, worldPosition.z);
          
          // Rotate bag to face outward toward the camera
          targetRotation.current = { 
            x: manualRotation.x, 
            y: bagAngleY + Math.PI + manualRotation.y, // Rotate to face outward from center + manual rotation
            z: 0 
          };
          
          // Smoothly interpolate to target rotation
          bagRef.current.rotation.x += (targetRotation.current.x - bagRef.current.rotation.x) * 0.1;
          bagRef.current.rotation.y += (targetRotation.current.y - bagRef.current.rotation.y) * 0.1;
          bagRef.current.rotation.z += (targetRotation.current.z - bagRef.current.rotation.z) * 0.1;
        }
        
        return;
      }
      
      if (isPaused || isHovered) {
        // Store the time when paused or hovered
        if (pausedTimeRef.current === 0) {
          pausedTimeRef.current = state.clock.elapsedTime;
        }
        return;
      } else {
        // Calculate time offset when unpausing/unhovering
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
          onPointerEnter(bagId);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onPointerLeave();
        }}
      >
        <primitive object={clonedScene} scale={scaleRef.current} />
      </group>
    </group>
  );
}

// Main Scene Component
function OrbitScene({ 
  rotation,
  onBagPointerEnter,
  onBagPointerLeave,
  isPaused,
  hoveredBagId,
  zoomedBagId,
  isDraggingZoomedBag,
  zoomedBagRotation,
  bagPositionsRef
}: { 
  rotation: { x: number; y: number };
  onBagPointerEnter: (bagId: number) => void;
  onBagPointerLeave: () => void;
  isPaused: boolean;
  hoveredBagId: number | null;
  zoomedBagId: number | null;
  isDraggingZoomedBag: boolean;
  zoomedBagRotation: { x: number; y: number };
  bagPositionsRef: React.MutableRefObject<{ [key: number]: { x: number; y: number; z: number } }>;
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
        isPaused={zoomedBagId !== null}
      />
      <OrbitRing 
        radiusX={16} 
        radiusZ={20} 
        tiltX={-0.3} 
        tiltZ={0.25} 
        rotationSpeed={{ x: 0.12, y: -0.0015, z: 0.14 }}
        isPaused={zoomedBagId !== null}
      />
      <OrbitRing 
        radiusX={20} 
        radiusZ={26} 
        tiltX={0.15} 
        tiltZ={-0.2} 
        rotationSpeed={{ x: 0.1, y: 0.001, z: 0.11 }}
        isPaused={zoomedBagId !== null}
      />
      
      {/* Center 3D Logo */}
      <AltLogo3D isPaused={zoomedBagId !== null} />
      
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
        isPaused={isPaused || zoomedBagId !== null}
        isHovered={hoveredBagId === 1 || zoomedBagId === 1}
        isZoomed={zoomedBagId === 1}
        isDragging={isDraggingZoomedBag && zoomedBagId === 1}
        manualRotation={zoomedBagRotation}
        bagPositionsRef={bagPositionsRef}
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
        isPaused={isPaused || zoomedBagId !== null}
        isHovered={hoveredBagId === 2 || zoomedBagId === 2}
        isZoomed={zoomedBagId === 2}
        isDragging={isDraggingZoomedBag && zoomedBagId === 2}
        manualRotation={zoomedBagRotation}
        bagPositionsRef={bagPositionsRef}
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
        isPaused={isPaused || zoomedBagId !== null}
        isHovered={hoveredBagId === 3 || zoomedBagId === 3}
        isZoomed={zoomedBagId === 3}
        isDragging={isDraggingZoomedBag && zoomedBagId === 3}
        manualRotation={zoomedBagRotation}
        bagPositionsRef={bagPositionsRef}
      />
    </group>
  );
}

function Collections() {
  const [system3DRotation, setSystem3DRotation] = useState({ x: 0, y: 0 });
  const [isDraggingSystem, setIsDraggingSystem] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isHoveringBag, setIsHoveringBag] = useState(false);
  const [hoveredBagId, setHoveredBagId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoomedBagId, setZoomedBagId] = useState<number | null>(null); // Track which bag is zoomed in
  const [isDraggingZoomedBag, setIsDraggingZoomedBag] = useState(false);
  const [zoomedBagRotation, setZoomedBagRotation] = useState({ x: 0, y: 0 });
  const [scrollZoomLevel, setScrollZoomLevel] = useState(1.0); // Scroll zoom multiplier (1.0 = default)
  const [cameraZoom, setCameraZoom] = useState(40); // Camera Z position (40 = default, 25 = zoomed in)
  const [cameraTarget, setCameraTarget] = useState<{ x: number; y: number; z: number } | null>(null); // Camera look-at target
  const [isAnimatingToDefault, setIsAnimatingToDefault] = useState(false); // Track if we're animating to default
  const baseCameraDistance = React.useRef<number>(40); // Store the base camera distance for zoomed bag
  const bagPositionsRef = React.useRef<{ [key: number]: { x: number; y: number; z: number } }>({
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: 0, z: 0 },
    3: { x: 0, y: 0, z: 0 }
  });
  const isHoveringBagRef = React.useRef(false);
  const targetRotation = React.useRef({ x: 0, y: 0 });
  const justZoomedRef = React.useRef(false); // Prevent immediate zoom out after zoom in
  
  // Temporarily unused - for future modal functionality
  const [isPaused] = useState(false);
  const [selectedBag] = useState<number | null>(null);
  const [clickPosition] = useState({ x: 0, y: 0 });
  const [modalAnimating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const productImages = [laced1, laced2, laced3, laced4, '3d'] as const;
  const handleClosePopup = () => {};
  
  // Animate system rotation to target when resetting to default
  React.useEffect(() => {
    if (!isAnimatingToDefault) return;
    
    let animationFrameId: number;
    let shouldContinue = true;
    
    const animate = () => {
      if (!shouldContinue) return;
      
      setSystem3DRotation((current) => {
        const dx = targetRotation.current.x - current.x;
        const dy = targetRotation.current.y - current.y;
        
        // Check if we're close enough to the target (within 0.01 radians)
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
          shouldContinue = false;
          setIsAnimatingToDefault(false);
          return targetRotation.current;
        }
        
        // Smoothly interpolate towards target
        const newRotation = {
          x: current.x + dx * 0.1,
          y: current.y + dy * 0.1
        };
        
        // Schedule next frame only if we're still animating
        if (shouldContinue) {
          animationFrameId = requestAnimationFrame(animate);
        }
        
        return newRotation;
      });
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      shouldContinue = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isAnimatingToDefault]);
  
  const handleSystemMouseDown = (e: React.MouseEvent) => {
    // If a bag is already zoomed and we're hovering over it, start rotation
    if (zoomedBagId !== null && isHoveringBagRef.current && hoveredBagId === zoomedBagId) {
      setIsDraggingZoomedBag(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (isHoveringBagRef.current && hoveredBagId) {
      // Zoom in to the bag (first click)
      if (zoomedBagId !== hoveredBagId) {
        const bagPos = bagPositionsRef.current[hoveredBagId];
        
        // Calculate distance from center to bag
        const distanceFromCenter = Math.sqrt(
          bagPos.x * bagPos.x + 
          bagPos.y * bagPos.y + 
          bagPos.z * bagPos.z
        );
        
        // Set camera distance: bag's distance from center + fixed viewing distance
        // This ensures all bags appear the same size when zoomed
        const viewingDistance = 15; // Fixed distance to view the bag from
        const cameraDistance = distanceFromCenter + viewingDistance;
        
        setCameraTarget({ x: bagPos.x, y: bagPos.y, z: bagPos.z }); // Look at the bag in 3D
        setCameraZoom(cameraDistance); // Dynamic zoom based on bag position
        setZoomedBagId(hoveredBagId);
        setZoomedBagRotation({ x: 0, y: 0 }); // Reset rotation for new zoom
        justZoomedRef.current = true;
        
        // Allow zoom out after a short delay
        setTimeout(() => {
          justZoomedRef.current = false;
        }, 300);
      }
      // Don't start dragging system if clicking on bag
      return;
    }
    
    // Click on background while zoomed -> zoom out
    if (zoomedBagId !== null) {
      // Animate rotation back to default
      targetRotation.current = { x: 0, y: 0 };
      setIsAnimatingToDefault(true);
      
      // Reset other states
      setCameraZoom(40);
      setCameraTarget(null);
      setZoomedBagId(null);
      setScrollZoomLevel(1.0);
      justZoomedRef.current = false;
      return;
    }
    
    // Start dragging the system
    setIsAnimatingToDefault(false); // Stop any ongoing animation
    setIsDraggingSystem(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };
  
  const handleSystemMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for crosshair
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (isDraggingZoomedBag) {
      // Rotate the zoomed bag
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      
      setZoomedBagRotation({
        x: zoomedBagRotation.x - deltaY * 0.01,
        y: zoomedBagRotation.y + deltaX * 0.01,
      });
      
      setDragStartPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (isDraggingSystem) {
      // Rotate the entire system
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      
      setSystem3DRotation({
        x: system3DRotation.x - deltaY * 0.01,
        y: system3DRotation.y + deltaX * 0.01,
      });
      
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleSystemMouseUp = () => {
    setIsDraggingSystem(false);
    setIsDraggingZoomedBag(false);
  };
  
  const handleBagPointerEnter = (bagId: number) => {
    // If another bag is zoomed in, don't allow hovering on other bags
    if (zoomedBagId !== null && zoomedBagId !== bagId) {
      return;
    }
    
    isHoveringBagRef.current = true;
    setIsHoveringBag(true);
    setHoveredBagId(bagId);
  };
  
  const handleBagPointerLeave = () => {
    // Mark that we've left the bag's bounds
    isHoveringBagRef.current = false;
    
    // When a bag is zoomed, don't zoom out on pointer leave
    // Only zoom out when explicitly clicking to zoom out or clicking background
    if (zoomedBagId !== null) {
      setIsHoveringBag(false);
      setHoveredBagId(null);
      return;
    }
    
    setIsHoveringBag(false);
    setHoveredBagId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (zoomedBagId === null) return; // Only zoom when a bag is already zoomed
    
    e.preventDefault();
    
    // Adjust scroll zoom level
    const zoomDelta = e.deltaY * 0.001; // Scale down the delta for smooth zooming
    setScrollZoomLevel((prev) => Math.max(0.5, Math.min(3.0, prev + zoomDelta))); // Clamp between 0.5x and 3x
  };
  
  return (
          <div 
      className="xp-desktop" 
            style={{
        background: '#88b4d7', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden', 
        cursor: zoomedBagId !== null ? (isDraggingZoomedBag ? 'grabbing' : 'grab') : 'none'
      }}
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [0, 0, cameraZoom], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        onPointerDown={(e) => {
          handleSystemMouseDown(e as any);
        }}
        onPointerMove={(e) => {
          handleSystemMouseMove(e as any);
        }}
        onPointerUp={handleSystemMouseUp}
        onPointerLeave={handleSystemMouseUp}
      >
        <CameraController zoom={cameraZoom} lookAtTarget={cameraTarget} scrollZoomLevel={scrollZoomLevel} />
        <Suspense fallback={null}>
          <OrbitScene 
            rotation={system3DRotation}
            onBagPointerEnter={handleBagPointerEnter}
            onBagPointerLeave={handleBagPointerLeave}
            isPaused={false}
            hoveredBagId={hoveredBagId}
            zoomedBagId={zoomedBagId}
            isDraggingZoomedBag={isDraggingZoomedBag}
            zoomedBagRotation={zoomedBagRotation}
            bagPositionsRef={bagPositionsRef}
          />
        </Suspense>
      </Canvas>
      
      {/* Close button when zoomed */}
      {zoomedBagId !== null && (
        <button
          onClick={() => {
            // Animate rotation back to default
            targetRotation.current = { x: 0, y: 0 };
            setIsAnimatingToDefault(true);
            
            // Reset other states
            setCameraZoom(40);
            setCameraTarget(null);
            setZoomedBagId(null);
            setScrollZoomLevel(1.0);
            justZoomedRef.current = false;
          }}
          style={{
            position: 'fixed',
            top: '40px',
            right: '40px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid #eb4b29',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#eb4b29',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#eb4b29';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = '#eb4b29';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>
      )}

      {/* Reset Camera Button - Always visible */}
      <button
        onClick={() => {
          // Animate rotation back to default
          targetRotation.current = { x: 0, y: 0 };
          setIsAnimatingToDefault(true);
          
          // Reset other states
          setCameraZoom(40);
          setCameraTarget(null);
          setZoomedBagId(null);
          setScrollZoomLevel(1.0);
          justZoomedRef.current = false;
        }}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '2px solid #eb4b29',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#eb4b29',
          fontSize: '20px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#eb4b29';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.color = '#eb4b29';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Reset Camera"
      >
        ⟲
      </button>
      
      {/* Space Game Crosshair - hidden when zoomed */}
      {zoomedBagId === null && (
        <>
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
        </>
      )}

      {/* Modal Overlay - Temporarily disabled */}
      {false && (
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
