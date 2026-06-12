import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function DataWall() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  // Massive plane covering the entire background
  const geo = useMemo(() => new THREE.PlaneGeometry(120, 120, 60, 60), []);
  
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#6366f1', // Professional indigo
    wireframe: true,
    transparent: true,
    opacity: 0.25, // Subtle but clearly visible
  }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * 0.4;
    const positions = meshRef.current.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i); 
      
      // Calculate smooth, professional wave mapping representing "Data Flow"
      const wave1 = Math.sin(x * 0.05 + t) * 2.5;
      const wave2 = Math.cos(y * 0.05 - t * 0.8) * 2.5;
      const wave3 = Math.sin(Math.sqrt(x*x + y*y) * 0.05 + t) * 2;
      
      // Update Z coordinate for height (rippling towards camera)
      positions.setZ(i, wave1 + wave2 + wave3);
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh 
      ref={meshRef} 
      geometry={geo} 
      material={mat} 
      position={[0, 0, -15]} 
      // Slight tilt for aesthetic perspective
      rotation={[-0.1, 0.05, 0]}
    />
  );
}

export default function SemanticLandscape() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden">
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 75 }} 
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#050505', 10, 50]} />
        <DataWall />
      </Canvas>
      
      {/* Seamless edge fades to blend with surrounding sections */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent z-10" />
    </div>
  );
}
