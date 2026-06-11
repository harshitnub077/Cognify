import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function SemanticDataCore() {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);

  const outerGeo = useMemo(() => new THREE.IcosahedronGeometry(3.5, 3), []);
  const innerGeo = useMemo(() => new THREE.IcosahedronGeometry(2.0, 2), []);
  
  // Store original positions for vertex animation
  const outerPositions = useMemo(() => outerGeo.attributes.position.clone(), [outerGeo]);

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    
    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.05 + pointer.x * 0.1;
      outerRef.current.rotation.x = t * 0.03 - pointer.y * 0.1;
      
      // Gentle breathing effect on outer shell
      const positions = outerRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = outerPositions.getX(i);
        const y = outerPositions.getY(i);
        const z = outerPositions.getZ(i);
        
        // Simple radial breathing
        const scale = 1 + Math.sin(t * 1.5 + y * 2) * 0.03;
        
        positions.setXYZ(i, x * scale, y * scale, z * scale);
      }
      positions.needsUpdate = true;
    }
    
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.08 + pointer.x * 0.15;
      innerRef.current.rotation.z = t * 0.05;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.PI / 2.5 + pointer.y * 0.1;
      ringsRef.current.rotation.y = pointer.x * 0.1;
      // slowly rotate the rings
      ringsRef.current.rotation.z = t * 0.02;
    }
  });

  return (
    <group position={[0, -0.2, -4]}>
      {/* Outer Shell - Sparse Data Mesh */}
      <mesh ref={outerRef} geometry={outerGeo}>
        <meshBasicMaterial 
          color="#475569" // Slate-600
          wireframe
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Core - Dense Neural Center */}
      <mesh ref={innerRef} geometry={innerGeo}>
        <meshBasicMaterial 
          color="#cbd5e1" // Slate-300
          wireframe
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbital Data Rings */}
      <group ref={ringsRef}>
        {[4.2, 4.8, 5.4].map((radius, i) => (
          <mesh key={i} rotation-x={Math.PI / 2} rotation-y={i * Math.PI / 8}>
            <torusGeometry args={[radius, 0.004, 16, 128]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.08 - i * 0.02} 
            />
          </mesh>
        ))}
        {/* Adds a faint glowing center point */}
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

export default function Hero3DScene() {
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        {/* Subtle fog so it fades out deeply */}
        <fog attach="fog" args={['#050505', 3, 14]} />
        <SemanticDataCore />
      </Canvas>
    </div>
  );
}
