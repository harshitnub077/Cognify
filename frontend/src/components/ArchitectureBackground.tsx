import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function MinimalWave() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  // Grid size and density
  const width = 30;
  const height = 20;
  const widthSegments = 60;
  const heightSegments = 40;

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.4;
    if (meshRef.current) {
      const position = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        
        // Fluid, minimalist wave math
        const waveX = Math.sin(x * 0.2 + t) * 0.8;
        const waveY = Math.cos(y * 0.2 + t * 0.8) * 0.8;
        const z = waveX + waveY;
        
        position.setZ(i, z);
      }
      position.needsUpdate = true;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2 + 0.15, 0, 0]} 
      position={[0, -1.5, 0]}
    >
      <planeGeometry args={[width, height, widthSegments, heightSegments]} />
      <meshBasicMaterial 
        color="#ffffff" 
        wireframe 
        transparent 
        opacity={0.25} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
}

export default function ArchitectureBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 opacity-100">
        <Canvas camera={{ position: [0, 1.2, 5], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          {/* Soft depth fog to fade the wave into the horizon */}
          <fog attach="fog" args={['#050505', 3, 15]} />
          <MinimalWave />
        </Canvas>
      </div>
      
      {/* Subtle top masking to blend with the section above */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050505] via-[#050505]/90 to-transparent z-10" />
      
      {/* Soft bottom blend to merge seamlessly into the footer */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10" />
    </div>
  );
}
