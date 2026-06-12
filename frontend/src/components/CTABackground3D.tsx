import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleRings() {
  const groupRef = useRef<THREE.Group>(null!);
  
  // Create 3 rings of particles
  const [particles] = React.useState(() => {
    const arr = [];
    for (let i = 0; i < 3; i++) {
      const radius = 3 + i * 1.5;
      const count = 200 + i * 100;
      const positions = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) {
        const theta = (j / count) * Math.PI * 2;
         
        positions[j * 3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 0.4;
         
        positions[j * 3 + 1] = (Math.random() - 0.5) * 0.4;
         
        positions[j * 3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 0.4;
      }
      arr.push(positions);
    }
    return arr;
  });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.2;
      groupRef.current.rotation.y = t * 0.05;
      groupRef.current.children.forEach((child, index) => {
        child.rotation.y = t * 0.02 * (index + 1) * (index % 2 === 0 ? 1 : -1);
      });
    }
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 3, 0, 0]}>
      {particles.map((pos, i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[pos, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.03}
            color="#ffffff"
            transparent
            opacity={0.5 - i * 0.15}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  );
}

function FloatingGeometry() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.1;
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.position.y = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 1]} />
      <meshBasicMaterial 
        color="#ffffff" 
        wireframe 
        transparent 
        opacity={0.08} 
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

const CTABackground3D: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-[0] flex items-center justify-center overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={['#050505', 2, 10]} />
        <ParticleRings />
        <FloatingGeometry />
      </Canvas>
      {/* Overlay to seamlessly blend the 3D scene into the background and ensure text is readable */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_70%)] z-10" />
      <div className="absolute inset-0 bg-[#050505]/30 z-10" />
    </div>
  );
};

export default CTABackground3D;
