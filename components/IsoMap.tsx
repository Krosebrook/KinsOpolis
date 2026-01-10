/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { MapControls, Environment, Instance, Instances, Float, useTexture, Outlines, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Grid, BuildingType, TileData } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';

// --- Constants & Helpers ---
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

// Deterministic random based on coordinates
const getHash = (x: number, y: number) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
const getRandomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Determine road style based on neighbors
const getRoadStyle = (grid: Grid, x: number, y: number): 'residential' | 'commercial' | 'industrial' | 'highway' => {
  const neighbors = [
    grid[y][x-1], grid[y][x+1], 
    grid[y-1]?.[x], grid[y+1]?.[x],
    // Diagonals for broader context
    grid[y-1]?.[x-1], grid[y-1]?.[x+1],
    grid[y+1]?.[x-1], grid[y+1]?.[x+1]
  ];
  
  let isIndustrial = false;
  let isCommercial = false;
  let isResidential = false;
  
  for(const n of neighbors) {
    if(!n) continue;
    if(n.buildingType === BuildingType.Industrial) isIndustrial = true;
    if(n.buildingType === BuildingType.Commercial) isCommercial = true;
    if(n.buildingType === BuildingType.Residential) isResidential = true;
  }

  // Priority: Industrial (dirtier) > Commercial (busy) > Residential (clean)
  if (isIndustrial) return 'industrial';
  if (isCommercial) return 'commercial';
  if (isResidential) return 'residential';
  return 'highway'; // Default to highway style for main roads/un-zoned areas
};

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

// Road Geometries
const roadLineGeo = new THREE.PlaneGeometry(0.1, 0.5);
const roadCornerGeo = new THREE.PlaneGeometry(0.12, 0.12);
const highwayLineGeo = new THREE.PlaneGeometry(0.25, 0.5); // Much thicker for highways
const highwayCornerGeo = new THREE.PlaneGeometry(0.27, 0.27);

// Prop Geometries
const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5);
poleGeo.translate(0, 0.6, 0); // Pivot at bottom
const lightHeadGeo = new THREE.BoxGeometry(0.4, 0.05, 0.15);
lightHeadGeo.translate(0.2, 1.15, 0); // Offset to sit on pole top
const barrierGeo = new THREE.BoxGeometry(0.1, 0.3, 1);
barrierGeo.translate(0, 0.15, 0); // Pivot at bottom

// Shared Materials for Roads
const roadMaterials = {
  residential: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), // White lines
  commercial: new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.5 }), // Yellow lines
  industrial: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.9 }), // Orange/Caution lines
  highway: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4, emissive: '#a16207', emissiveIntensity: 0.2 }), // Bright thick yellow
};

// Prop Materials
const propMaterials = {
  metal: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 }),
  light: new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fef9c3', emissiveIntensity: 2, toneMapped: false }),
  barrier: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8 }) // Concrete
};

// --- 1. Advanced Procedural Buildings ---

// FIX: Wrap component in React.memo to ensure TypeScript recognizes it as a component that accepts a 'key' prop.
const WindowBlock = React.memo(({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial color="#bfdbfe" emissive="#bfdbfe" emissiveIntensity={0.2} roughness={0.1} metalness={0.8} />
  </mesh>
));

const SmokeStack = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const cloud = child as THREE.Mesh;
        cloud.position.y += 0.01 + i * 0.005;
        cloud.scale.addScalar(0.005);
        
        const material = cloud.material as THREE.MeshStandardMaterial;
        if (material) {
          material.opacity -= 0.005;
          if (cloud.position.y > 1.5) {
            cloud.position.y = 0;
            cloud.scale.setScalar(0.1 + Math.random() * 0.1);
            material.opacity = 0.6;
          }
        }
      });
    }
  });

  return (
    <group position={position}>
      <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.2, 1, 0.2]}>
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <group ref={ref} position={[0, 1, 0]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} geometry={sphereGeo} position={[Math.random()*0.1, i*0.4, Math.random()*0.1]} scale={0.2}>
            <meshStandardMaterial color="#d1d5db" transparent opacity={0.6} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

interface BuildingMeshProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  opacity?: number;
  transparent?: boolean;
}

const ProceduralBuilding = React.memo(({ type, baseColor, x, y, opacity = 1, transparent = false }: BuildingMeshProps) => {
  const hash = getHash(x, y);
  const variant = Math.floor(hash * 100); // 0-99
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  
  // Color variation
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    // Shift hue and lightness slightly based on hash
    c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
    return c;
  }, [baseColor, hash]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, opacity, transparent, roughness: 0.8 }), [color, opacity, transparent]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5).offsetHSL(0,0,-0.1), flatShading: true, opacity, transparent }), [color, opacity, transparent]);

  const commonProps = { castShadow: true, receiveShadow: true };

  // Buildings are built assuming y=0 is ground level within their group
  // Adjust vertical position to sit on top of ground tile (approx -0.3)
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation, 0]} position={[0, yOffset, 0]}>
      {(() => {
        switch (type) {
          case BuildingType.Residential:
            if (variant < 33) {
              // Cozy Cottage
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                  <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                  <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.1, 0.32]} scale={[0.15, 0.2, 0.05]} />
                </>
              );
            } else if (variant < 66) {
              // Modern Boxy
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.1, 0.35, 0]} scale={[0.6, 0.7, 0.8]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.25, 0.25, 0.1]} scale={[0.4, 0.5, 0.6]} />
                  <WindowBlock position={[-0.1, 0.5, 0.41]} scale={[0.4, 0.2, 0.05]} />
                </>
              );
            } else {
              // Townhouse
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.5, 1, 0.6]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 1.05, 0]} scale={[0.55, 0.1, 0.65]} />
                  <WindowBlock position={[0, 0.7, 0.31]} scale={[0.3, 0.2, 0.05]} />
                  <WindowBlock position={[0, 0.3, 0.31]} scale={[0.3, 0.2, 0.05]} />
                </>
              );
            }

          case BuildingType.Commercial:
            if (variant < 40) {
              // High-rise
              const height = 1.5 + hash * 1.5;
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, height/2, 0]} scale={[0.7, height, 0.7]} />
                  {Array.from({ length: Math.floor(height * 3) }).map((_, i) => (
                    <WindowBlock key={i} position={[0, 0.2 + i * 0.3, 0]} scale={[0.72, 0.15, 0.72]} />
                  ))}
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, height + 0.1, 0]} scale={[0.5, 0.2, 0.5]} />
                </>
              );
            } else if (variant < 70) {
              // Shop
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                  <WindowBlock position={[0, 0.3, 0.41]} scale={[0.8, 0.4, 0.05]} />
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({ color: hash > 0.5 ? '#ef4444' : '#3b82f6' })} geometry={boxGeo} position={[0, 0.55, 0.5]} scale={[0.9, 0.1, 0.2]} rotation={[Math.PI/6, 0, 0]} />
                </>
              );
            } else {
              // Corner store
               return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.2, 0.5, -0.2]} scale={[0.5, 1, 0.5]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.1, 0.3, 0.1]} scale={[0.7, 0.6, 0.7]} />
                  <WindowBlock position={[0.1, 0.3, 0.46]} scale={[0.6, 0.3, 0.05]} />
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#9ca3af'})} geometry={boxGeo} position={[0.2, 0.65, 0.2]} scale={[0.2, 0.1, 0.2]} />
                </>
               )
            }

          case BuildingType.Industrial:
            if (variant < 50) {
              // Factory
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                  <SmokeStack position={[0.3, 0.4, 0.3]} />
                </>
              );
            } else {
              // Warehouse
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.2, 0.3, 0]} scale={[0.5, 0.6, 0.9]} />
                  <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0.25, 0.4, -0.2]} scale={[0.2, 0.8, 0.2]} />
                  <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0.25, 0.4, 0.25]} scale={[0.2, 0.8, 0.2]} />
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#6b7280'})} geometry={boxGeo} position={[0.25, 0.7, 0]} scale={[0.05, 0.05, 0.5]} />
                </>
              );
            }

          case BuildingType.Park:
            const treeCount = 1 + Math.floor(hash * 3);
            const positions = [[-0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2]];
            
            return (
              <group position={[0, -yOffset - 0.29, 0]}> {/* Adjust park base to sit exactly on top of ground tile */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#86efac" />
                </mesh>
                
                {variant < 30 && (
                    <group position={[0,0.05,0]}>
                        <mesh material={new THREE.MeshStandardMaterial({color: '#cbd5e1'})} geometry={cylinderGeo} scale={[0.4, 0.1, 0.4]} castShadow receiveShadow />
                        <mesh material={new THREE.MeshStandardMaterial({color: '#3b82f6', roughness: 0.1})} geometry={cylinderGeo} position={[0, 0.06, 0]} scale={[0.3, 0.05, 0.3]} />
                    </group>
                )}

                {Array.from({length: treeCount}).map((_, i) => {
                    const pos = positions[i % positions.length];
                    const scale = 0.5 + getHash(x+i, y-i) * 0.5;
                    const treeColor = new THREE.Color("#166534").offsetHSL(0, 0, getHash(x,y+i)*0.2);
                    return (
                    <group key={i} position={[pos[0], 0, pos[1]]} scale={scale} rotation={[0, getHash(i,x)*Math.PI, 0]}>
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#78350f' })} geometry={cylinderGeo} position={[0, 0.15, 0]} scale={[0.1, 0.3, 0.1]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.65, 0]} scale={[0.3, 0.4, 0.3]} />
                    </group>
                    )
                })}
              </group>
            );
          case BuildingType.Road:
             return null;
          default:
            return null;
        }
      })()}
    </group>
  );
});

// --- 2. Dynamic Systems (Traffic, Citizens, Environment) ---

const RoadPropsSystem = React.memo(({ grid }: { grid: Grid }) => {
  const polesRef = useRef<THREE.InstancedMesh>(null);
  const headsRef = useRef<THREE.InstancedMesh>(null);
  const barriersRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Max instances estimation (enough for 2 barriers/light per road tile worst case)
  const MAX_COUNT = GRID_SIZE * GRID_SIZE * 2;

  useEffect(() => {
    if (!polesRef.current || !headsRef.current || !barriersRef.current) return;

    let poleIdx = 0;
    let barrierIdx = 0;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid[y][x];
        if (tile.buildingType !== BuildingType.Road) continue;

        const [wx, _, wz] = gridToWorld(x, y);
        const style = getRoadStyle(grid, x, y);

        const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
        const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
        const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
        const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;

        // Simplified Flow Detection for Props
        const isVertical = (hasUp || hasDown) && !hasLeft && !hasRight;
        const isHorizontal = (hasLeft || hasRight) && !hasUp && !hasDown;

        // 1. Streetlights (Sparse placement)
        // Pseudo-random but deterministic placement (every ~5th tile)
        if ((x * 7 + y * 13) % 5 === 0) { 
            let px = 0, pz = 0, prot = 0;
            let place = false;

            if (isVertical) {
                const isLeft = (x + y) % 2 === 0;
                px = wx + (isLeft ? -0.45 : 0.45);
                pz = wz;
                prot = isLeft ? 0 : Math.PI;
                place = true;
            } else if (isHorizontal) {
                const isTop = (x + y) % 2 === 0;
                px = wx;
                pz = wz + (isTop ? -0.45 : 0.45);
                prot = isTop ? -Math.PI/2 : Math.PI/2;
                place = true;
            }

            if (place) {
                dummy.position.set(px, -0.3, pz);
                dummy.rotation.set(0, prot, 0);
                dummy.scale.setScalar(1);
                dummy.updateMatrix();
                
                polesRef.current.setMatrixAt(poleIdx, dummy.matrix);
                headsRef.current.setMatrixAt(poleIdx, dummy.matrix);
                poleIdx++;
            }
        }

        // 2. Barriers (Highway, Straight only)
        if (style === 'highway') {
             if (isVertical) {
                 // Left Barrier
                 dummy.position.set(wx - 0.45, -0.3, wz);
                 dummy.rotation.set(0, 0, 0);
                 dummy.scale.setScalar(1);
                 dummy.updateMatrix();
                 barriersRef.current.setMatrixAt(barrierIdx++, dummy.matrix);

                 // Right Barrier
                 dummy.position.set(wx + 0.45, -0.3, wz);
                 dummy.rotation.set(0, 0, 0);
                 dummy.scale.setScalar(1);
                 dummy.updateMatrix();
                 barriersRef.current.setMatrixAt(barrierIdx++, dummy.matrix);
             } else if (isHorizontal) {
                 // Top Barrier
                 dummy.position.set(wx, -0.3, wz - 0.45);
                 dummy.rotation.set(0, Math.PI/2, 0);
                 dummy.scale.setScalar(1);
                 dummy.updateMatrix();
                 barriersRef.current.setMatrixAt(barrierIdx++, dummy.matrix);

                 // Bottom Barrier
                 dummy.position.set(wx, -0.3, wz + 0.45);
                 dummy.rotation.set(0, Math.PI/2, 0);
                 dummy.scale.setScalar(1);
                 dummy.updateMatrix();
                 barriersRef.current.setMatrixAt(barrierIdx++, dummy.matrix);
             }
        }
      }
    }

    polesRef.current.count = poleIdx;
    headsRef.current.count = poleIdx;
    barriersRef.current.count = barrierIdx;

    polesRef.current.instanceMatrix.needsUpdate = true;
    headsRef.current.instanceMatrix.needsUpdate = true;
    barriersRef.current.instanceMatrix.needsUpdate = true;

  }, [grid]);

  return (
    <group>
        <instancedMesh ref={polesRef} args={[poleGeo, propMaterials.metal, MAX_COUNT]} castShadow receiveShadow />
        <instancedMesh ref={headsRef} args={[lightHeadGeo, propMaterials.light, MAX_COUNT]} />
        <instancedMesh ref={barriersRef} args={[barrierGeo, propMaterials.barrier, MAX_COUNT]} castShadow receiveShadow />
    </group>
  );
});

const carColors = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937', '#f97316'];

const TrafficSystem = ({ grid }: { grid: Grid }) => {
  const roadTiles = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    grid.forEach(row => row.forEach(tile => {
      if (tile.buildingType === BuildingType.Road) roads.push({x: tile.x, y: tile.y});
    }));
    return roads;
  }, [grid]);

  // Adjust car count for performance on big map
  const carCount = Math.min(roadTiles.length, 100);
  const carsRef = useRef<THREE.InstancedMesh>(null);
  const carsState = useRef<Float32Array>(new Float32Array(0)); 
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(0), []);

  useEffect(() => {
    if (roadTiles.length < 2) return;
    carsState.current = new Float32Array(carCount * 6);
    const newColors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
      const startNode = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      carsState.current[i*6 + 0] = startNode.x;
      carsState.current[i*6 + 1] = startNode.y;
      carsState.current[i*6 + 2] = startNode.x;
      carsState.current[i*6 + 3] = startNode.y;
      carsState.current[i*6 + 4] = 1; // force pick new target
      carsState.current[i*6 + 5] = getRandomRange(0.01, 0.03); // speed

      const color = new THREE.Color(carColors[Math.floor(Math.random() * carColors.length)]);
      newColors[i*3] = color.r; newColors[i*3+1] = color.g; newColors[i*3+2] = color.b;
    }

    if (carsRef.current) {
        carsRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
    }
  }, [roadTiles, carCount]);

  useFrame(() => {
    if (!carsRef.current || roadTiles.length < 2 || carsState.current.length === 0) return;

    for (let i = 0; i < carCount; i++) {
      const idx = i * 6;
      let curX = carsState.current[idx];
      let curY = carsState.current[idx+1];
      let tarX = carsState.current[idx+2];
      let tarY = carsState.current[idx+3];
      let progress = carsState.current[idx+4];
      const speed = carsState.current[idx+5];

      progress += speed;

      if (progress >= 1) {
        curX = tarX;
        curY = tarY;
        progress = 0;
        
        const neighbors = roadTiles.filter(t => 
          (Math.abs(t.x - curX) === 1 && t.y === curY) || 
          (Math.abs(t.y - curY) === 1 && t.x === curX)
        );

        if (neighbors.length > 0) {
            const valid = neighbors.length > 1 
                ? neighbors.filter(n => Math.abs(n.x - carsState.current[idx]) > 0.1 || Math.abs(n.y - carsState.current[idx+1]) > 0.1)
                : neighbors;
            
            const next = valid.length > 0 
                ? valid[Math.floor(Math.random() * valid.length)]
                : neighbors[0];
            
            tarX = next.x;
            tarY = next.y;
        } else {
            const rnd = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            curX = rnd.x; curY = rnd.y; tarX = rnd.x; tarY = rnd.y;
        }
      }

      carsState.current[idx] = curX;
      carsState.current[idx+1] = curY;
      carsState.current[idx+2] = tarX;
      carsState.current[idx+3] = tarY;
      carsState.current[idx+4] = progress;

      const gx = MathUtils.lerp(curX, tarX, progress);
      const gy = MathUtils.lerp(curY, tarY, progress);

      const dx = tarX - curX;
      const dy = tarY - curY;
      const angle = Math.atan2(dy, dx);
      
      const offsetAmt = 0.15;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const offX = (-dy/len) * offsetAmt;
      const offY = (dx/len) * offsetAmt;

      const [wx, _, wz] = gridToWorld(gx + offX, gy + offY);

      dummy.position.set(wx, -0.3 + 0.075, wz);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(0.5, 0.15, 0.3); 
      
      dummy.updateMatrix();
      carsRef.current.setMatrixAt(i, dummy.matrix);
    }
    carsRef.current.instanceMatrix.needsUpdate = true;
  });

  if (roadTiles.length < 2) return null;

  return (
    <instancedMesh ref={carsRef} args={[boxGeo, undefined, carCount]} castShadow>
      <meshStandardMaterial roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
};

const clothesColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

const PopulationSystem = ({ population, grid }: { population: number, grid: Grid }) => {
    // Limit agents for performance on huge map
    const agentCount = Math.min(Math.floor(population / 2), 500); 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
          if (tile.buildingType === BuildingType.Road || tile.buildingType === BuildingType.Park || tile.buildingType === BuildingType.None) {
            tiles.push({x: tile.x, y: tile.y});
          }
        }));
        return tiles;
    }, [grid]);
    
    const agentsState = useRef<Float32Array>(new Float32Array(0));
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useEffect(() => {
        if (agentCount === 0 || walkableTiles.length === 0) return;
        agentsState.current = new Float32Array(agentCount * 6);
        const newColors = new Float32Array(agentCount * 3);

        for(let i=0; i<agentCount; i++) {
            const t = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            const x = t.x + getRandomRange(-0.4, 0.4);
            const y = t.y + getRandomRange(-0.4, 0.4);

            agentsState.current[i*6+0] = x;
            agentsState.current[i*6+1] = y;
            
            const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            agentsState.current[i*6+2] = tt.x + getRandomRange(-0.4, 0.4);
            agentsState.current[i*6+3] = tt.y + getRandomRange(-0.4, 0.4);
            
            agentsState.current[i*6+4] = getRandomRange(0.005, 0.015);
            agentsState.current[i*6+5] = Math.random() * Math.PI * 2;

            const c = new THREE.Color(clothesColors[Math.floor(Math.random() * clothesColors.length)]);
            newColors[i*3] = c.r; newColors[i*3+1] = c.g; newColors[i*3+2] = c.b;
        }

        if (meshRef.current) {
            meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
        }
    }, [agentCount, walkableTiles]);

    useFrame((state) => {
        if (!meshRef.current || agentCount === 0 || agentsState.current.length === 0) return;
        const time = state.clock.elapsedTime;

        for(let i=0; i<agentCount; i++) {
            const idx = i*6;
            let x = agentsState.current[idx];
            let y = agentsState.current[idx+1];
            let tx = agentsState.current[idx+2];
            let ty = agentsState.current[idx+3];
            const speed = agentsState.current[idx+4];
            const animOffset = agentsState.current[idx+5];

            const dx = tx - x;
            const dy = ty - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 0.1) {
                if (walkableTiles.length > 0) {
                    const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                    tx = tt.x + getRandomRange(-0.4, 0.4);
                    ty = tt.y + getRandomRange(-0.4, 0.4);
                    agentsState.current[idx+2] = tx;
                    agentsState.current[idx+3] = ty;
                }
            } else {
                x += (dx/dist) * speed;
                y += (dy/dist) * speed;
                agentsState.current[idx] = x;
                agentsState.current[idx+1] = y;
            }

            const [wx, _, wz] = gridToWorld(x, y);

            const bounce = Math.abs(Math.sin(time * 10 + animOffset)) * 0.03;

            const height = 0.2;
            const width = 0.08;
            const groundY = -0.35; 

            dummy.position.set(wx, groundY + height/2 + bounce, wz);
            dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
            dummy.scale.set(width, height, width);
            
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (agentCount === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[boxGeo, undefined, agentCount]} castShadow>
            <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
    )
};

// Clouds & Birds
const Cloud = ({ position, scale, speed }: { position: [number, number, number], scale: number, speed: number }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (group.current) {
            group.current.position.x += speed * delta;
            if (group.current.position.x > GRID_SIZE) group.current.position.x = -GRID_SIZE;
        }
    });

    const bubbles = useMemo(() => Array.from({length: 5 + Math.random() * 5}).map(() => ({
        pos: [getRandomRange(-1,1), getRandomRange(-0.5, 0.5), getRandomRange(-1,1)] as [number, number, number],
        scale: getRandomRange(0.5, 1.2)
    })), []);

    return (
        <group ref={group} position={position} scale={scale}>
            {bubbles.map((b, i) => (
                <mesh key={i} geometry={sphereGeo} position={b.pos} scale={b.scale} castShadow>
                    <meshStandardMaterial color="white" flatShading opacity={0.9} transparent />
                </mesh>
            ))}
        </group>
    )
}

const Bird = ({ position, speed, offset }: { position: [number, number, number], speed: number, offset: number }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            const time = state.clock.elapsedTime + offset;
            ref.current.position.x = position[0] + Math.sin(time * speed) * GRID_SIZE / 2;
            ref.current.position.z = position[1] + Math.cos(time * speed) * GRID_SIZE / 3;
            ref.current.rotation.y = -time * speed + Math.PI;
            ref.current.scale.y = 1 + Math.sin(time * 15) * 0.3;
        }
    });

    return (
        <group ref={ref} position={[position[0], position[2], position[1]]}>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[0.1,0,0]} rotation={[0, Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[-0.1,0,0]} rotation={[0, -Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
        </group>
    )
}

const EnvironmentEffects = () => {
    return (
        <group raycast={() => null}>
             {/* Clouds - spread further out for big map */}
            <Cloud position={[-20, 15, 4]} scale={2} speed={0.4} />
            <Cloud position={[10, 18, -15]} scale={2.5} speed={0.3} />
            <Cloud position={[25, 12, 10]} scale={3} speed={0.2} />
            
            {/* Birds */}
            <group position={[0, 5, 0]} scale={1}>
                <Bird position={[0, 0, 0]} speed={0.3} offset={0} />
                <Bird position={[5, 5, 5]} speed={0.4} offset={1.2} />
            </group>

            {/* Water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[GRID_SIZE * 3, GRID_SIZE * 3]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.1} metalness={0.5} opacity={0.8} transparent />
            </mesh>
        </group>
    )
};

const CelebrationEffect = ({ active }: { active: boolean }) => {
  const particles = useMemo(() => {
    return Array.from({ length: 100 }).map(() => ({
      pos: [getRandomRange(-5, 5), getRandomRange(5, 15), getRandomRange(-5, 5)] as [number, number, number],
      color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
      speed: getRandomRange(0.05, 0.2),
      offset: Math.random() * 10
    }));
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
        const colors = new Float32Array(particles.length * 3);
        particles.forEach((p, i) => {
            colors[i*3] = p.color.r;
            colors[i*3+1] = p.color.g;
            colors[i*3+2] = p.color.b;
        });
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }
  }, [particles]);

  useFrame((state) => {
    if (!active || !meshRef.current) return;
    particles.forEach((p, i) => {
        const time = state.clock.elapsedTime;
        const y = p.pos[1] - ((time * 5 + p.offset) % 15);
        dummy.position.set(p.pos[0], y, p.pos[2]);
        dummy.rotation.set(time + p.offset, time + p.offset, 0);
        dummy.scale.setScalar(0.2);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.visible = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[boxGeo, undefined, particles.length]}>
        <meshBasicMaterial />
    </instancedMesh>
  )
}


// --- 3. Main Map Component ---

const RoadMarkings = React.memo(({ x, y, grid, yOffset }: { x: number; y: number; grid: Grid; yOffset: number }) => {
  // Determine style
  const style = useMemo(() => getRoadStyle(grid, x, y), [grid, x, y]);
  const material = roadMaterials[style];
  
  // Choose geometry based on style
  const isHighway = style === 'highway';
  const lineGeo = isHighway ? highwayLineGeo : roadLineGeo;
  const cornerGeo = isHighway ? highwayCornerGeo : roadCornerGeo;

  const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
  const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
  const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
  const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;

  const connections = [hasUp, hasDown, hasLeft, hasRight].filter(Boolean).length;
  
  if (connections === 0) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]} geometry={lineGeo} material={material} />
    );
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
      {(hasUp || hasDown) && (hasLeft || hasRight) && (
        <mesh position={[0, 0, 0.005]} material={material} geometry={cornerGeo} />
      )}
      {hasUp && <mesh position={[0, 0.25, 0]} geometry={lineGeo} material={material} />}
      {hasDown && <mesh position={[0, -0.25, 0]} geometry={lineGeo} material={material} />}
      {hasLeft && <mesh position={[-0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={lineGeo} material={material} />}
      {hasRight && <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={lineGeo} material={material} />}
    </group>
  );
});

// Instanced Ground System for High Performance
const GroundSystem = React.memo(({ grid, onTileClick, onHover, onLeave }: { 
    grid: Grid, 
    onTileClick: (x: number, y: number) => void,
    onHover: (x: number, y: number) => void,
    onLeave: () => void 
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const hoveredRef = useRef<number | null>(null);
    const count = GRID_SIZE * GRID_SIZE;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Initial setup of positions
    useEffect(() => {
        if (!meshRef.current) return;
        
        let i = 0;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const [wx, _, wz] = gridToWorld(x, y);
                dummy.position.set(wx, -0.3 - 0.25, wz); // Center Y: Top is -0.3, height 0.5. Center = -0.3 - 0.25 = -0.55
                dummy.scale.set(1, 0.5, 1);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                i++;
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [dummy]);

    // Update colors when grid changes
    useEffect(() => {
        if (!meshRef.current) return;
        const colors = new Float32Array(count * 3);
        let i = 0;
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const type = grid[y][x].buildingType;
                const noise = getHash(x, y);
                let c = new THREE.Color();

                if (type === BuildingType.None) {
                    const hex = noise > 0.7 ? '#22c55e' : noise > 0.3 ? '#4ade80' : '#86efac';
                    c.set(hex);
                } else if (type === BuildingType.Road) {
                    const style = getRoadStyle(grid, x, y);
                    if (style === 'industrial') c.set('#334155'); // Dark Slate
                    else if (style === 'residential') c.set('#64748b'); // Slate 500
                    else if (style === 'commercial') c.set('#475569'); // Slate 600
                    else c.set('#1e293b'); // Highway - Darker/Fresh Asphalt
                } else {
                    c.set('#d1d5db');
                }
                
                colors[i*3] = c.r;
                colors[i*3+1] = c.g;
                colors[i*3+2] = c.b;
                i++;
            }
        }
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor.needsUpdate = true;
    }, [grid, count]);

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[boxGeo, undefined, count]} 
            receiveShadow 
            castShadow
            onPointerMove={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) {
                    const idx = e.instanceId;
                    const x = idx % GRID_SIZE;
                    const y = Math.floor(idx / GRID_SIZE);
                    if (hoveredRef.current !== idx) {
                        hoveredRef.current = idx;
                        onHover(x, y);
                    }
                }
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                hoveredRef.current = null;
                onLeave();
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && e.button === 0) {
                     const idx = e.instanceId;
                     const x = idx % GRID_SIZE;
                     const y = Math.floor(idx / GRID_SIZE);
                     onTileClick(x, y);
                }
            }}
        >
            <meshStandardMaterial roughness={1} flatShading />
        </instancedMesh>
    )
});

const Cursor = ({ x, y, color }: { x: number, y: number, color: string }) => {
  const [wx, _, wz] = gridToWorld(x, y);
  return (
    <mesh position={[wx, -0.25, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthTest={false} />
      <Outlines thickness={0.05} color="white" />
    </mesh>
  );
};


interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  population: number;
  celebrate?: boolean;
}

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, population, celebrate = false }) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const handleHover = useCallback((x: number, y: number) => {
    setHoveredTile({ x, y });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredTile(null);
  }, []);

  const showPreview = hoveredTile && grid[hoveredTile.y][hoveredTile.x].buildingType === BuildingType.None && hoveredTool !== BuildingType.None;
  const previewColor = showPreview ? BUILDINGS[hoveredTool].color : 'white';
  const isBulldoze = hoveredTool === BuildingType.None;
  
  const previewPos = hoveredTile ? gridToWorld(hoveredTile.x, hoveredTile.y) : [0,0,0];

  return (
    <div className="absolute inset-0 bg-sky-400 touch-none">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        {/* Adjusted Camera for huge map */}
        <OrthographicCamera makeDefault zoom={20} position={[50, 50, 50]} near={-200} far={1000} />
        
        <MapControls 
          enableRotate={true}
          enableZoom={true}
          minZoom={5} 
          maxZoom={100}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.1}
          target={[0,-0.5,0]}
        />

        <ambientLight intensity={0.6} color="#cceeff" />
        <directionalLight
          castShadow
          position={[30, 50, 20]}
          intensity={1.8}
          color="#fffbeb"
          shadow-mapSize={[4096, 4096]}
          // Shadow camera needs to cover the huge map
          shadow-camera-left={-80} shadow-camera-right={80}
          shadow-camera-top={80} shadow-camera-bottom={-80}
        >
        </directionalLight>
        <Environment preset="park" />

        <EnvironmentEffects />
        <CelebrationEffect active={celebrate} />

        <group>
          {/* Instanced Ground for Performance */}
          <GroundSystem 
            grid={grid} 
            onTileClick={onTileClick}
            onHover={handleHover}
            onLeave={handleLeave}
          />
          
          <RoadPropsSystem grid={grid} />
        
          {/* Buildings & Details - Rendered as individual instances/components */}
          {grid.map((row, y) =>
            row.map((tile, x) => {
              const [wx, _, wz] = gridToWorld(x, y);
              
              if (tile.buildingType === BuildingType.Road) {
                  // Render road markings individually (they are low cost planes)
                  return (
                    <RoadMarkings key={`${x}-${y}-road`} x={x} y={y} grid={grid} yOffset={-0.25 + 0.25 + 0.001} />
                  )
              }

              if (tile.buildingType !== BuildingType.None) {
                  return (
                    <group key={`${x}-${y}`} position={[wx, 0, wz]} raycast={() => null}>
                      <ProceduralBuilding 
                        type={tile.buildingType} 
                        baseColor={BUILDINGS[tile.buildingType].color} 
                        x={x} y={y} 
                      />
                    </group>
                  )
              }
              return null;
            })
          )}

          <group raycast={() => null}>
            <TrafficSystem grid={grid} />
            <PopulationSystem population={population} grid={grid} />

            {showPreview && hoveredTile && (
              <group position={[previewPos[0], 0, previewPos[2]]}>
                <Float speed={3} rotationIntensity={0} floatIntensity={0.1} floatingRange={[0, 0.1]}>
                  <ProceduralBuilding 
                    type={hoveredTool} 
                    baseColor={previewColor} 
                    x={hoveredTile.x} 
                    y={hoveredTile.y} 
                    transparent 
                    opacity={0.7} 
                  />
                </Float>
              </group>
            )}

            {hoveredTile && (
              <Cursor 
                x={hoveredTile.x} 
                y={hoveredTile.y} 
                color={isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#000000')} 
              />
            )}
          </group>
        </group>
        
        {/* SoftShadows removed to fix shader compatibility issue */}
      </Canvas>
    </div>
  );
};

export default IsoMap;