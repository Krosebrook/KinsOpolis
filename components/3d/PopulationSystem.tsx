
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Grid, BuildingType, Citizen } from '../../types';
import { GRID_SIZE } from '../../constants';

// Shared Geometries & Materials
const bodyGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
const headGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

interface Props {
    grid: Grid;
    population: number;
    onCitizenClick: (citizen: Citizen) => void;
}

const clothesColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

const PopulationSystem: React.FC<Props> = ({ grid, population, onCitizenClick }) => {
    // Limit visible agents for performance
    const agentCount = Math.min(Math.floor(population / 2) + 5, 200); 
    
    const bodyMesh = useRef<THREE.InstancedMesh>(null);
    const headMesh = useRef<THREE.InstancedMesh>(null);
    
    // Store agent data in refs to avoid re-renders on tick
    const agentsData = useRef<Citizen[]>([]);
    
    // Float32Array Structure per agent (8 floats):
    // 0: targetX
    // 1: targetZ
    // 2: progress (not strictly used with vector math but kept for potential lerp)
    // 3: speed
    // 4: state (0 = walking, 1 = idle)
    // 5: idleTimer (seconds remaining)
    // 6: gaitFreq (bounce speed multiplier)
    // 7: gaitAmp (bounce height multiplier)
    const targets = useRef<Float32Array>(new Float32Array(0)); 
    
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Find walkable tiles
    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
            if (tile.buildingType === BuildingType.Road || 
                tile.buildingType === BuildingType.Park || 
                tile.buildingType === BuildingType.None) {
                tiles.push({x: tile.x, y: tile.y});
            }
        }));
        return tiles;
    }, [grid]);

    // Initialize Agents
    useEffect(() => {
        if (walkableTiles.length === 0) return;

        const newAgents: Citizen[] = [];
        const newTargets = new Float32Array(agentCount * 8);
        const colors = new Float32Array(agentCount * 3);

        for (let i = 0; i < agentCount; i++) {
            const startTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            
            // Random offset within tile
            const ox = (Math.random() - 0.5) * 0.6;
            const oy = (Math.random() - 0.5) * 0.6;

            const colorHex = clothesColors[Math.floor(Math.random() * clothesColors.length)];
            const color = new THREE.Color(colorHex);

            newAgents.push({
                id: `citizen-${i}`,
                x: startTile.x + ox,
                y: startTile.y + oy,
                color: colorHex
            });

            // Set colors for instance
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;

            // Initialize AI state
            const targetTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            const idx = i * 8;
            newTargets[idx+0] = targetTile.x + (Math.random() - 0.5) * 0.6; // tx
            newTargets[idx+1] = targetTile.y + (Math.random() - 0.5) * 0.6; // ty
            newTargets[idx+2] = 0; // progress
            newTargets[idx+3] = 0.005 + Math.random() * 0.01; // speed
            newTargets[idx+4] = Math.random() > 0.5 ? 1 : 0; // random start state
            newTargets[idx+5] = Math.random() * 3; // idle timer
            newTargets[idx+6] = 10 + Math.random() * 10; // gait freq (fast/slow bounce)
            newTargets[idx+7] = 0.03 + Math.random() * 0.05; // gait amp (high/low bounce)
        }

        agentsData.current = newAgents;
        targets.current = newTargets;

        if (bodyMesh.current) bodyMesh.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        
    }, [agentCount, walkableTiles]); // Re-run if grid changes drastically or pop changes

    useFrame((state, delta) => {
        if (!bodyMesh.current || !headMesh.current || agentsData.current.length === 0) return;

        const time = state.clock.elapsedTime;

        for (let i = 0; i < agentCount; i++) {
            const agent = agentsData.current[i];
            const idx = i * 8;
            
            let tx = targets.current[idx+0];
            let ty = targets.current[idx+1];
            // idx+2 progress unused
            const speed = targets.current[idx+3];
            let aiState = targets.current[idx+4];
            let idleTimer = targets.current[idx+5];
            const gaitFreq = targets.current[idx+6];
            const gaitAmp = targets.current[idx+7];

            // AI Logic
            if (aiState === 1) { // Idle
                idleTimer -= delta;
                targets.current[idx+5] = idleTimer;
                
                if (idleTimer <= 0) {
                    // Start Walking
                    targets.current[idx+4] = 0; // Set state to walking
                    if (walkableTiles.length > 0) {
                        const next = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                        tx = next.x + (Math.random() - 0.5) * 0.6;
                        ty = next.y + (Math.random() - 0.5) * 0.6;
                        targets.current[idx+0] = tx;
                        targets.current[idx+1] = ty;
                    }
                }
            } else { // Walking
                const dx = tx - agent.x;
                const dy = ty - agent.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 0.1) {
                    // Arrived -> Go Idle
                    targets.current[idx+4] = 1; // Set state to idle
                    targets.current[idx+5] = 1 + Math.random() * 4; // Idle for 1-5s
                } else {
                    // Move
                    const moveX = (dx / dist) * speed;
                    const moveY = (dy / dist) * speed;
                    agent.x += moveX;
                    agent.y += moveY;
                }
            }

            // Render
            const [wx, _, wz] = gridToWorld(agent.x, agent.y);
            
            // Animation
            let bounce = 0;
            let wobble = 0;
            
            if (aiState === 0) {
                // Walking animation
                bounce = Math.abs(Math.sin(time * gaitFreq)) * gaitAmp;
                // Face direction of movement (if walking)
                const dx = tx - agent.x;
                const dy = ty - agent.y;
                dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
            } else {
                // Idle animation (breathing/looking around)
                bounce = Math.sin(time * 2) * 0.01; // slow breathe
                wobble = Math.sin(time * 1 + i) * 0.05; // slight rotation
                dummy.rotation.set(0, wobble, 0);
            }

            // Body
            dummy.position.set(wx, -0.3 + 0.125 + bounce, wz);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            bodyMesh.current.setMatrixAt(i, dummy.matrix);

            // Head (bobbing slightly differently)
            dummy.position.set(wx, -0.3 + 0.3 + bounce + 0.01, wz);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            headMesh.current.setMatrixAt(i, dummy.matrix);
        }

        bodyMesh.current.instanceMatrix.needsUpdate = true;
        headMesh.current.instanceMatrix.needsUpdate = true;
    });

    const handleClick = (e: THREE.Event) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) {
            const citizen = agentsData.current[e.instanceId];
            if (citizen) onCitizenClick(citizen);
        }
    };

    return (
        <group>
            <instancedMesh 
                ref={bodyMesh} 
                args={[bodyGeo, undefined, agentCount]} 
                castShadow 
                onClick={handleClick}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'default'}
            >
                <meshStandardMaterial roughness={0.8} />
            </instancedMesh>
            <instancedMesh ref={headMesh} args={[headGeo, undefined, agentCount]} castShadow raycast={() => null}>
                <meshStandardMaterial color="#fca5a5" roughness={0.5} />
            </instancedMesh>
        </group>
    );
};

export default PopulationSystem;
