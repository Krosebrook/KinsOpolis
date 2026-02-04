
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
    const count = type === 'rain' ? 2000 : (type === 'snow' ? 1000 : 0);
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return Array.from({ length: count }).map(() => ({
            x: Math.random() * GRID_SIZE - GRID_SIZE/2,
            y: Math.random() * 20,
            z: Math.random() * GRID_SIZE - GRID_SIZE/2,
            speed: Math.random() * 0.2 + 0.1,
            drift: Math.random() * 0.05 - 0.02
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

    useFrame(() => {
        if (!mesh.current || count === 0) return;
        
        particles.forEach((p, i) => {
            p.y -= p.speed;
            p.x += p.drift;
            if (p.y < 0) {
                p.y = 20;
                p.x = Math.random() * GRID_SIZE - GRID_SIZE/2;
                p.z = Math.random() * GRID_SIZE - GRID_SIZE/2;
            }
            
            dummy.position.set(p.x, p.y, p.z);
            if (type === 'rain') {
                dummy.scale.set(0.05, 0.4, 0.05);
            } else {
                dummy.scale.set(0.1, 0.1, 0.1);
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
