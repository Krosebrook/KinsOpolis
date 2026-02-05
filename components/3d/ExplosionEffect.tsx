
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingType } from '../../types';

interface ExplosionProps {
  x: number;
  y: number;
  type: BuildingType;
  onComplete: () => void;
}

const PARTICLE_COUNT = 15;
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

const ExplosionEffect: React.FC<ExplosionProps> = ({ x, y, type, onComplete }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(performance.now());
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => ({
      pos: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1 + 0.05,
        (Math.random() - 0.5) * 0.1
      ),
      rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
      rotVel: new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1),
      scale: Math.random() * 0.1 + 0.05
    }));
  }, []);

  const color = useMemo(() => {
    if (type === BuildingType.Industrial) return new THREE.Color('#475569'); // Dark smoke
    if (type === BuildingType.Residential) return new THREE.Color('#fca5a5'); // Wood/Brick dust
    if (type === BuildingType.Commercial) return new THREE.Color('#94a3b8'); // Glass/Steel debris
    return new THREE.Color('#fbbf24'); // Sparks for roads
  }, [type]);

  useFrame(() => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    if (elapsed > 1) {
      onComplete();
      return;
    }

    if (meshRef.current) {
      particles.forEach((p, i) => {
        p.pos.add(p.vel);
        p.vel.y -= 0.005; // Gravity
        p.rot.add(p.rotVel);
        
        const fade = 1 - elapsed;
        const scale = p.scale * fade;
        
        dummy.position.copy(p.pos);
        dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[x, 0, y]}>
      <instancedMesh ref={meshRef} args={[boxGeo, undefined, PARTICLE_COUNT]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
};

export default ExplosionEffect;
