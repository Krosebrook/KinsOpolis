
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Grid, BuildingType, Citizen } from '../../types';
import { GRID_SIZE } from '../../constants';
import { findPath } from '../../services/pathfinding';

const bodyGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
const headGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
const hatGeo = new THREE.ConeGeometry(0.06, 0.1, 8);

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
    const hatMesh = useRef<THREE.InstancedMesh>(null);
    
    const [agents, setAgents] = useState<Citizen[]>([]);
    
    // 0: hasHat, 1: speed, 2: state (0:walking, 1:idle), 3: timer, 4: gaitFreq, 5: gaitAmp
    const agentAttributes = useRef<Float32Array>(new Float32Array(0)); 
    
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
            if (tile.buildingType === BuildingType.None || 
                tile.buildingType === BuildingType.Road || 
                tile.buildingType === BuildingType.Highway ||
                tile.buildingType === BuildingType.Park) {
                tiles.push({x: tile.x, y: tile.y});
            }
        }));
        return tiles;
    }, [grid]);

    useEffect(() => {
        if (walkableTiles.length === 0) return;

        const newAgents: Citizen[] = [];
        const newAttrs = new Float32Array(agentCount * 6);
        const colors = new Float32Array(agentCount * 3);

        for (let i = 0; i < agentCount; i++) {
            const startTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            const colorHex = clothesColors[Math.floor(Math.random() * clothesColors.length)];
            const color = new THREE.Color(colorHex);

            newAgents.push({
                id: `citizen-${i}`,
                x: startTile.x,
                y: startTile.y,
                color: colorHex,
                path: []
            });

            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;

            const idx = i * 6;
            newAttrs[idx+0] = Math.random() > 0.7 ? 1 : 0; 
            newAttrs[idx+1] = 0.02 + Math.random() * 0.03; 
            newAttrs[idx+2] = 1; // Start idle
            newAttrs[idx+3] = Math.random() * 3; 
            newAttrs[idx+4] = 8 + Math.random() * 12; 
            newAttrs[idx+5] = 0.02 + Math.random() * 0.05; 
        }

        setAgents(newAgents);
        agentAttributes.current = newAttrs;

        if (bodyMesh.current) bodyMesh.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        
    }, [agentCount, walkableTiles]);

    useFrame((state, delta) => {
        if (!bodyMesh.current || !headMesh.current || !hatMesh.current || agents.length === 0) return;

        const time = state.clock.elapsedTime;

        agents.forEach((agent, i) => {
            const idx = i * 6;
            
            const hasHat = agentAttributes.current[idx+0];
            const speed = agentAttributes.current[idx+1];
            let aiState = agentAttributes.current[idx+2];
            let timer = agentAttributes.current[idx+3];
            const gaitFreq = agentAttributes.current[idx+4];
            const gaitAmp = agentAttributes.current[idx+5];

            if (aiState === 1) { // Idle
                timer -= delta;
                agentAttributes.current[idx+3] = timer;
                if (timer <= 0) {
                    // Try to find a new path
                    if (walkableTiles.length > 0) {
                        const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                        const path = findPath({x: agent.x, y: agent.y}, target, grid);
                        if (path && path.length > 1) {
                            agent.path = path.slice(1); // skip current tile
                            agentAttributes.current[idx+2] = 0; // State: Walking
                        } else {
                            agentAttributes.current[idx+3] = 1 + Math.random() * 2; // Wait more
                        }
                    }
                }
            } else { // Walking
                if (!agent.path || agent.path.length === 0) {
                    agentAttributes.current[idx+2] = 1; // Idle
                    agentAttributes.current[idx+3] = 1 + Math.random() * 4;
                } else {
                    const nextTile = agent.path[0];
                    const dx = nextTile.x - agent.x;
                    const dy = nextTile.y - agent.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < 0.1) {
                        agent.x = nextTile.x;
                        agent.y = nextTile.y;
                        agent.path.shift();
                    } else {
                        agent.x += (dx / dist) * speed;
                        agent.y += (dy / dist) * speed;
                    }
                }
            }

            const [wx, _, wz] = gridToWorld(agent.x, agent.y);
            
            let bounce = 0;
            let headTurn = 0;
            let scaleY = 1;
            
            if (aiState === 0) { // Walking
                bounce = Math.abs(Math.sin(time * gaitFreq)) * gaitAmp;
                const nextTile = agent.path?.[0] || agent;
                const dx = nextTile.x - agent.x;
                const dy = nextTile.y - agent.y;
                dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
            } else { // Idle
                bounce = Math.sin(time * 1.5 + i) * 0.003; 
                const shrugFactor = Math.pow(Math.max(0, Math.sin(time * 1.2 + i * 1.3)), 4) * 0.1; 
                scaleY = 1 + shrugFactor;
                headTurn = Math.sin(time * 0.7 + i) * 0.3 + Math.sin(time * 1.8 + i * 2) * 0.1;
                dummy.rotation.set(0, 0, 0);
            }

            dummy.position.set(wx, -0.3 + 0.125 + bounce, wz);
            dummy.scale.set(1, scaleY, 1);
            dummy.updateMatrix();
            bodyMesh.current!.setMatrixAt(i, dummy.matrix);

            dummy.position.set(wx, -0.3 + 0.3 + bounce * 0.8 + 0.01 + (scaleY - 1) * 0.1, wz);
            if (aiState === 1) dummy.rotation.set(0, headTurn, 0);
            else dummy.rotation.set(0, dummy.rotation.y, 0); 
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            headMesh.current!.setMatrixAt(i, dummy.matrix);

            if (hasHat) {
                dummy.position.set(wx, -0.3 + 0.38 + bounce * 0.8 + (scaleY - 1) * 0.1, wz);
                dummy.updateMatrix();
                hatMesh.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                hatMesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });

        bodyMesh.current.instanceMatrix.needsUpdate = true;
        headMesh.current.instanceMatrix.needsUpdate = true;
        hatMesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group raycast={interactionDisabled ? () => null : undefined}>
            <instancedMesh ref={bodyMesh} args={[bodyGeo, undefined, agentCount]} castShadow>
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
