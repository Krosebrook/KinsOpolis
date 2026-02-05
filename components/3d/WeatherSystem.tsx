
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GRID_SIZE } from '../../constants';

interface WeatherProps {
    type: 'sunny' | 'rain' | 'snow';
}

const WeatherSystem: React.FC<WeatherProps> = ({ type }) => {
    const count = type === 'rain' ? 3000 : (type === 'snow' ? 1500 : 0);
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return Array.from({ length: count }).map(() => ({
            x: Math.random() * GRID_SIZE - GRID_SIZE/2,
            y: Math.random() * 20,
            z: Math.random() * GRID_SIZE - GRID_SIZE/2,
            speed: Math.random() * 0.2 + 0.1,
            drift: Math.random() * 0.05 - 0.02,
            offset: Math.random() * Math.PI
        }));
    }, [count, type]);

    useEffect(() => {
        if (!mesh.current || count === 0) return;
        const color = type === 'rain' ? new THREE.Color('#a5f3fc') : new THREE.Color('#ffffff');
        const colors = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        mesh.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }, [count, type]);

    useFrame((state) => {
        if (!mesh.current || count === 0) return;
        
        particles.forEach((p, i) => {
            p.y -= p.speed;
            if (type === 'snow') {
                p.x += Math.sin(state.clock.elapsedTime + p.offset) * 0.02; // Sway
            } else {
                p.x += p.drift; // Rain drift
            }

            if (p.y < 0) {
                p.y = 20;
                p.x = Math.random() * GRID_SIZE - GRID_SIZE/2;
                p.z = Math.random() * GRID_SIZE - GRID_SIZE/2;
            }
            
            dummy.position.set(p.x, p.y, p.z);
            if (type === 'rain') {
                dummy.scale.set(0.03, 0.6, 0.03);
            } else {
                dummy.scale.set(0.12, 0.12, 0.12);
            }
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    if (type === 'sunny') return null;

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => null}>
            {type === 'rain' ? <boxGeometry /> : <sphereGeometry args={[1,4,4]} />}
            <meshBasicMaterial transparent opacity={0.6} />
        </instancedMesh>
    );
};

export default WeatherSystem;
