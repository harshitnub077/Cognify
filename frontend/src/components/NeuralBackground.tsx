import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Node Positions Generator ────────────────────────────────────────────────
function buildNodePositions(count: number, spread: number) {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    arr.push(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 0.6,
      (Math.random() - 0.5) * spread * 0.4,
    );
  }
  return arr;
}

// ─── Edge Builder ────────────────────────────────────────────────────────────
function buildEdges(nodes: number[], threshold: number) {
  const count = nodes.length / 3;
  const edges: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = nodes[i * 3] - nodes[j * 3];
      const dy = nodes[i * 3 + 1] - nodes[j * 3 + 1];
      const dz = nodes[i * 3 + 2] - nodes[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < threshold) {
        edges.push(nodes[i * 3], nodes[i * 3 + 1], nodes[i * 3 + 2]);
        edges.push(nodes[j * 3], nodes[j * 3 + 1], nodes[j * 3 + 2]);
      }
    }
  }
  return edges;
}

// ─── Neural Scene ────────────────────────────────────────────────────────────
function NeuralScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);
  const pointsRef = useRef<THREE.Points>(null!);

  const NODE_COUNT = 200;
  const SPREAD = 12;
  const EDGE_THRESHOLD = 2.4;

  const { nodePosArr, edgePosArr, initialPos } = useMemo(() => {
    const raw = buildNodePositions(NODE_COUNT, SPREAD);
    const edges = buildEdges(raw, EDGE_THRESHOLD);
    return {
      nodePosArr: new Float32Array(raw),
      initialPos: new Float32Array(raw),
      edgePosArr: new Float32Array(edges),
    };
  }, []);

  const nodeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(nodePosArr, 3));
    return geo;
  }, [nodePosArr]);

  const edgeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(edgePosArr, 3));
    return geo;
  }, [edgePosArr]);

  // Bright glowing nodes
  const nodeMat = useMemo(() => new THREE.PointsMaterial({
    size: 0.08,
    color: '#ffffff',
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  }), []);

  // Faint data connections
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#94a3b8',
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
  }), []);

  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 2), []);
  const sphereMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#334155',
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05;
      groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.1;
    }
    
    // Simulate "drift tracking" by slowly moving nodes
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < NODE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        // Subtle drift oscillation
        positions.array[ix] = initialPos[ix] + Math.sin(t * 0.5 + initialPos[iy]) * 0.2;
        positions.array[iy] = initialPos[iy] + Math.cos(t * 0.3 + initialPos[ix]) * 0.2;
      }
      positions.needsUpdate = true;
    }

    // Core intent sphere pulsing
    if (sphereRef.current) {
      const pulse = 1 + Math.sin(t * 1.5) * 0.03;
      sphereRef.current.scale.setScalar(pulse);
      sphereRef.current.rotation.y = t * 0.1;
      sphereRef.current.rotation.z = t * 0.05;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <lineSegments geometry={edgeGeo} material={edgeMat} />
        <points ref={pointsRef} geometry={nodeGeo} material={nodeMat} />
      </group>
      <mesh ref={sphereRef} geometry={sphereGeo} material={sphereMat} />
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
const NeuralBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-50">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={['#050505', 4, 15]} />
        <NeuralScene />
      </Canvas>
    </div>
  );
};

export default NeuralBackground;
