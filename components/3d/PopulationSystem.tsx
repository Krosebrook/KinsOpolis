
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Grid, BuildingType, Citizen } from '../../types';
import { GRID_SIZE } from '../../constants';

const bodyGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
const headGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
const hatGeo = new THREE.ConeGeometry(0.06, 0.1, 8);
const bagGeo = new THREE.BoxGeometry(0.08, 0.12, 0.04);

interface Props {
    grid: Grid;
    population: number;
    onCitizenClick: (citizen: Citizen) => void;
    interactionDisabled?: boolean;
}

const clothesColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

const PopulationSystem: React.FC<Props> = ({ grid, population, onCitizenClick, interactionDisabled = false }) => {
    const agentCount = Math.min(Math.floor(population / 2) + 5, 200); 
    
    const bodyMesh = useRef<THREE.InstancedMesh>(null);
    const headMesh = useRef<THREE.InstancedMesh>(null);
    const hatMesh = useRef<THREE.InstancedMesh>(null); // New accessory
    
    const agentsData = useRef<Citizen[]>([]);
    
    // 0: targetX, 1: targetZ, 2: hasHat, 3: speed, 4: state, 5: timer, 6: gaitFreq, 7: gaitAmp
    const targets = useRef<Float32Array>(new Float32Array(0)); 
    
    const dummy = useMemo(() => new THREE.Object3D(), []);

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

    useEffect(() => {
        if (walkableTiles.length === 0) return;

        const newAgents: Citizen[] = [];
        const newTargets = new Float32Array(agentCount * 8);
        const colors = new Float32Array(agentCount * 3);

        for (let i = 0; i < agentCount; i++) {
            const startTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
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

            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;

            const targetTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            const idx = i * 8;
            newTargets[idx+0] = targetTile.x + (Math.random() - 0.5) * 0.6;
            newTargets[idx+1] = targetTile.y + (Math.random() - 0.5) * 0.6;
            newTargets[idx+2] = Math.random() > 0.7 ? 1 : 0; // 30% chance for hat
            newTargets[idx+3] = 0.005 + Math.random() * 0.01; 
            newTargets[idx+4] = Math.random() > 0.5 ? 1 : 0; 
            newTargets[idx+5] = Math.random() * 3; 
            newTargets[idx+6] = 8 + Math.random() * 12; 
            newTargets[idx+7] = 0.02 + Math.random() * 0.05; 
        }

        agentsData.current = newAgents;
        targets.current = newTargets;

        if (bodyMesh.current) bodyMesh.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        
    }, [agentCount, walkableTiles]);

    useFrame((state, delta) => {
        if (!bodyMesh.current || !headMesh.current || !hatMesh.current || agentsData.current.length === 0) return;

        const time = state.clock.elapsedTime;

        for (let i = 0; i < agentCount; i++) {
            const agent = agentsData.current[i];
            const idx = i * 8;
            
            let tx = targets.current[idx+0];
            let ty = targets.current[idx+1];
            const hasHat = targets.current[idx+2];
            const speed = targets.current[idx+3];
            let aiState = targets.current[idx+4];
            let idleTimer = targets.current[idx+5];
            const gaitFreq = targets.current[idx+6];
            const gaitAmp = targets.current[idx+7];

            if (aiState === 1) { // Idle
                idleTimer -= delta;
                targets.current[idx+5] = idleTimer;
                if (idleTimer <= 0) {
                    targets.current[idx+4] = 0;
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
                    targets.current[idx+4] = 1; 
                    targets.current[idx+5] = 1 + Math.random() * 4;
                } else {
                    const moveX = (dx / dist) * speed;
                    const moveY = (dy / dist) * speed;
                    agent.x += moveX;
                    agent.y += moveY;
                }
            }

            const [wx, _, wz] = gridToWorld(agent.x, agent.y);
            
            let bounce = 0;
            let sway = 0;
            let headTurn = 0;
            let scaleY = 1;
            
            if (aiState === 0) {
                bounce = Math.abs(Math.sin(time * gaitFreq)) * gaitAmp;
                sway = Math.sin(time * gaitFreq * 0.5) * 0.15;
                const dx = tx - agent.x;
                const dy = ty - agent.y;
                dummy.rotation.set(0, -Math.atan2(dy, dx) + sway, 0);
            } else {
                bounce = Math.sin(time * 2 + i) * 0.005; 
                const shrugCycle = Math.sin(time * 0.5 + i * 13.5);
                if (shrugCycle > 0.95) scaleY = 1.05;
                const lookFactor = Math.sin(time * 0.7 + i * 100); 
                if (lookFactor > 0.7) headTurn = Math.sin(time * 2) * 0.6;
                dummy.rotation.set(0, 0, 0);
            }

            dummy.position.set(wx, -0.3 + 0.125 + bounce, wz);
            dummy.scale.set(1, scaleY, 1);
            dummy.updateMatrix();
            bodyMesh.current.setMatrixAt(i, dummy.matrix);

            dummy.position.set(wx, -0.3 + 0.3 + bounce * 0.8 + 0.01 + (scaleY - 1) * 0.2, wz);
            if (aiState === 1) dummy.rotation.set(0, headTurn, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            headMesh.current.setMatrixAt(i, dummy.matrix);

            // Hat Logic
            if (hasHat) {
                dummy.position.set(wx, -0.3 + 0.38 + bounce * 0.8 + (scaleY - 1) * 0.2, wz);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                hatMesh.current.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                hatMesh.current.setMatrixAt(i, dummy.matrix);
            }
        }

        bodyMesh.current.instanceMatrix.needsUpdate = true;
        headMesh.current.instanceMatrix.needsUpdate = true;
        hatMesh.current.instanceMatrix.needsUpdate = true;
    });

    const handleClick = (e: THREE.Event) => {
        if (interactionDisabled) return; 
        e.stopPropagation();
        if (e.instanceId !== undefined) {
            const citizen = agentsData.current[e.instanceId];
            if (citizen) onCitizenClick(citizen);
        }
    };

    return (
        <group raycast={interactionDisabled ? () => null : undefined}>
            <instancedMesh 
                ref={bodyMesh} 
                args={[bodyGeo, undefined, agentCount]} 
                castShadow 
                onClick={handleClick}
                onPointerOver={() => { if (!interactionDisabled) document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'default'; }}
            >
                <meshStandardMaterial roughness={0.8} />
            </instancedMesh>
            <instancedMesh ref={headMesh} args={[headGeo, undefined, agentCount]} castShadow raycast={() => null}>
                <meshStandardMaterial color="#fca5a5" roughness={0.5} />
            </instancedMesh>
            <instancedMesh ref={hatMesh} args={[hatGeo, undefined, agentCount]} castShadow raycast={() => null}>
                <meshStandardMaterial color="#1d4ed8" />
            </instancedMesh>
        </group>
    );
};

export default PopulationSystem;
