import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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

function buildEdges(nodes: number[], threshold: number) {
  const count = nodes.length / 3;
  const edges: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = nodes[i * 3] - nodes[j * 3];
      const dy = nodes[i * 3 + 1] - nodes[j * 3 + 1];
      const dz = nodes[i * 3 + 2] - nodes[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < threshold * threshold) {
        edges.push(nodes[i * 3], nodes[i * 3 + 1], nodes[i * 3 + 2]);
        edges.push(nodes[j * 3], nodes[j * 3 + 1], nodes[j * 3 + 2]);
      }
    }
  }
  return edges;
}

function NeuralScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);
  const pointsRef = useRef<THREE.Points>(null!);

  // Reduced from 200 → 120 nodes for better perf
  const NODE_COUNT = 120;
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

  const nodeMat = useMemo(() => new THREE.PointsMaterial({
    size: 0.07,
    color: '#ffffff',
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  }), []);

  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#94a3b8',
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  }), []);

  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 2), []);
  const sphereMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#334155',
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.04;
      groupRef.current.rotation.x = Math.sin(t * 0.018) * 0.08;
    }
    // Animate only every other frame for node drift — halves CPU cost
    if (pointsRef.current && Math.round(t * 60) % 2 === 0) {
      const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < NODE_COUNT; i++) {
        const ix = i * 3, iy = ix + 1;
        positions.array[ix] = initialPos[ix] + Math.sin(t * 0.4 + initialPos[iy]) * 0.18;
        positions.array[iy] = initialPos[iy] + Math.cos(t * 0.25 + initialPos[ix]) * 0.18;
      }
      positions.needsUpdate = true;
    }
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.025);
      sphereRef.current.rotation.y = t * 0.08;
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

const NeuralBackground: React.FC = () => (
  <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-50">
    <Canvas
      camera={{ position: [0, 0, 9], fov: 60 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1]}
      frameloop="always"
    >
      <fog attach="fog" args={['#050505', 4, 15]} />
      <NeuralScene />
    </Canvas>
    
    {/* Seamless edge fades to blend with surrounding sections */}
    <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#050505] via-[#050505]/90 to-transparent z-10" />
    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent z-10" />
  </div>
);

export default NeuralBackground;
