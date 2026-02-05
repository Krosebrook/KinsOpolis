
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Grid, BuildingType, DecorationType } from '../../types';
import { GRID_SIZE } from '../../constants';

interface Props {
    grid: Grid;
}

const birdGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
const rabbitGeo = new THREE.SphereGeometry(0.15, 8, 8);

const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

const WildlifeSystem: React.FC<Props> = ({ grid }) => {
    const birdsRef = useRef<THREE.InstancedMesh>(null);
    const rabbitsRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Analyze grid to find suitable habitats
    const habitats = useMemo(() => {
        const parks: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
            if (tile.buildingType === BuildingType.Park || tile.decoration === DecorationType.Tree || tile.decoration === DecorationType.Flower) {
                parks.push({x: tile.x, y: tile.y});
            }
        }));
        return parks;
    }, [grid]);

    // Birds (flying in circles overhead)
    const birdCount = 15;
    const birdData = useMemo(() => Array.from({ length: birdCount }).map(() => ({
        x: (Math.random() - 0.5) * GRID_SIZE,
        z: (Math.random() - 0.5) * GRID_SIZE,
        y: 3 + Math.random() * 2,
        speed: 0.5 + Math.random() * 0.5,
        radius: 2 + Math.random() * 5,
        offset: Math.random() * Math.PI * 2,
        angle: 0
    })), []);

    // Rabbits (hopping in parks)
    const rabbitCount = Math.min(habitats.length * 2, 20);
    const rabbitData = useMemo(() => {
        if (habitats.length === 0) return [];
        return Array.from({ length: rabbitCount }).map(() => {
            const home = habitats[Math.floor(Math.random() * habitats.length)];
            const [wx, _, wz] = gridToWorld(home.x, home.y);
            return {
                x: wx,
                z: wz,
                hopPhase: Math.random() * Math.PI * 2,
                targetX: wx + (Math.random() - 0.5),
                targetZ: wz + (Math.random() - 0.5),
                state: 'idle' as 'idle' | 'hop',
                timer: Math.random() * 2
            };
        });
    }, [habitats, rabbitCount]);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;

        // Animate Birds
        if (birdsRef.current) {
            birdData.forEach((bird, i) => {
                bird.angle += bird.speed * delta;
                const bx = bird.x + Math.cos(bird.angle + bird.offset) * bird.radius;
                const bz = bird.z + Math.sin(bird.angle + bird.offset) * bird.radius;
                
                // Bank the bird based on turn
                dummy.position.set(bx, bird.y + Math.sin(t * 2 + i) * 0.2, bz);
                dummy.rotation.set(Math.PI/2, Math.PI/2, bird.angle + bird.offset + Math.PI/2); // Oriented along path
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                birdsRef.current!.setMatrixAt(i, dummy.matrix);
            });
            birdsRef.current.instanceMatrix.needsUpdate = true;
        }

        // Animate Rabbits
        if (rabbitsRef.current && rabbitData.length > 0) {
            rabbitData.forEach((rabbit, i) => {
                let y = 0;
                if (rabbit.state === 'idle') {
                    rabbit.timer -= delta;
                    if (rabbit.timer <= 0) {
                        rabbit.state = 'hop';
                        rabbit.timer = 0.5; // Hop duration
                    }
                } else {
                    rabbit.timer -= delta;
                    // Move towards target
                    const dx = rabbit.targetX - rabbit.x;
                    const dz = rabbit.targetZ - rabbit.z;
                    rabbit.x += dx * delta * 2;
                    rabbit.z += dz * delta * 2;
                    // Jump arc
                    y = Math.sin((1 - rabbit.timer * 2) * Math.PI) * 0.3; 
                    
                    if (rabbit.timer <= 0) {
                        rabbit.state = 'idle';
                        rabbit.timer = 1 + Math.random() * 3;
                        // Pick new local target
                        if (habitats.length > 0) {
                             const home = habitats[Math.floor(Math.random() * habitats.length)];
                             const [wx, _, wz] = gridToWorld(home.x, home.y);
                             rabbit.targetX = wx + (Math.random() - 0.5);
                             rabbit.targetZ = wz + (Math.random() - 0.5);
                        }
                    }
                }

                dummy.position.set(rabbit.x, y - 0.3 + 0.1, rabbit.z);
                dummy.rotation.set(0, 0, 0);
                // Squish when landing
                const scaleY = y < 0.05 && rabbit.state === 'hop' ? 0.8 : 1;
                dummy.scale.set(1, scaleY, 1);
                dummy.updateMatrix();
                rabbitsRef.current!.setMatrixAt(i, dummy.matrix);
            });
            rabbitsRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group>
            <instancedMesh ref={birdsRef} args={[birdGeo, undefined, birdCount]} castShadow>
                <meshStandardMaterial color="#fef08a" />
            </instancedMesh>
            {rabbitCount > 0 && (
                <instancedMesh ref={rabbitsRef} args={[rabbitGeo, undefined, rabbitCount]} castShadow receiveShadow>
                    <meshStandardMaterial color="#e2e8f0" />
                </instancedMesh>
            )}
        </group>
    );
};

export default WildlifeSystem;
