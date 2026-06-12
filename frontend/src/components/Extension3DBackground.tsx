import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function FirewallGrid() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  // Massive vertical plane to act as the firewall shield
  const geo = useMemo(() => new THREE.PlaneGeometry(120, 80, 80, 50), []);
  
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff', // Clean white to match the monochromatic theme
    wireframe: true,
    transparent: true,
    opacity: 0.05, // Greatly reduced opacity for a subtler effect
  }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * 0.5;
    
    // Very gentle sway
    meshRef.current.position.x = Math.sin(t * 0.2) * 2;
    
    const positions = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Dynamic flowing ripples that mimic data streams or an active forcefield
      // This uses the exact same mathematical aesthetic as SemanticLandscape
      const wave1 = Math.sin(x * 0.08 + t) * 2.0;
      const wave2 = Math.cos(y * 0.1 - t * 0.8) * 1.5;
      const wave3 = Math.sin(Math.sqrt(x*x + y*y) * 0.05 - t * 1.2) * 1.0;
      
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
      // Perfect vertical wall
      rotation={[0, 0, 0]} 
    />
  );
}

export default function Extension3DBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 opacity-[0.9]">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          {/* Deep fog to blend the edges smoothly into the void */}
          <fog attach="fog" args={['#050505', 10, 35]} />
          
          <FirewallGrid />
          
          {/* Subtle ambient dust inspired directly by ArchitectureBackground */}
          <Sparkles count={300} scale={40} size={1.5} speed={0.2} opacity={0.15} color="#ffffff" />
        </Canvas>
      </div>
      
      {/* Central ambient glow highlighting the center of the firewall */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.1]">
        <div className="absolute w-[800px] h-[400px] bg-slate-100 rounded-full blur-[150px]" />
      </div>
      
      {/* Seamless edge fades */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent z-10" />
    </div>
  );
}
