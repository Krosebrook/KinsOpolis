
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Environment, Outlines, OrthographicCamera, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Grid, BuildingType, LensMode, AppSettings, Citizen } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';
import { computeLandValueMap, computePopulationMap } from '../services/analytics';
import ProceduralBuilding from './3d/ProceduralBuilding';
import WeatherSystem from './3d/WeatherSystem';
import PopulationSystem from './3d/PopulationSystem';

// --- Constants & Helpers ---
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1);
const lampGeo = new THREE.SphereGeometry(0.15, 8, 8);

// --- Road Props System ---
const RoadDetails = React.memo(({ grid, isNight }: { grid: Grid, isNight: boolean }) => {
    const poleRef = useRef<THREE.InstancedMesh>(null);
    const lightRef = useRef<THREE.InstancedMesh>(null);
    
    // Compute positions only when grid changes
    const props = useMemo(() => {
        const items: {x: number, y: number, rot: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Road) {
                // Simple logic: Place lamp if x+y is even (checkerboard) to reduce density
                if ((x + y) % 3 === 0) {
                    items.push({ x, y, rot: 0 });
                }
            }
        }));
        return items;
    }, [grid]);

    useEffect(() => {
        if (!poleRef.current || !lightRef.current) return;
        const dummy = new THREE.Object3D();
        
        props.forEach((p, i) => {
            const [wx, _, wz] = gridToWorld(p.x, p.y);
            // Place on corner of tile roughly
            dummy.position.set(wx + 0.35, 0, wz + 0.35);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            poleRef.current!.setMatrixAt(i, dummy.matrix);

            dummy.position.set(wx + 0.35, 0.5, wz + 0.35);
            dummy.updateMatrix();
            lightRef.current!.setMatrixAt(i, dummy.matrix);
        });
        
        poleRef.current.instanceMatrix.needsUpdate = true;
        lightRef.current.instanceMatrix.needsUpdate = true;
    }, [props]);

    if (props.length === 0) return null;

    return (
        <group>
            <instancedMesh ref={poleRef} args={[poleGeo, undefined, props.length]} castShadow receiveShadow>
                <meshStandardMaterial color="#374151" />
            </instancedMesh>
            <instancedMesh ref={lightRef} args={[lampGeo, undefined, props.length]}>
                <meshStandardMaterial 
                    color={isNight ? "#fef08a" : "#e5e7eb"} 
                    emissive={isNight ? "#fef08a" : "#000000"} 
                    emissiveIntensity={isNight ? 2 : 0} 
                />
            </instancedMesh>
        </group>
    );
});

// --- Simplified Ground System (Refactored) ---
const GroundSystem = React.memo(({ grid, onTileClick, onHover, onLeave, lensMode }: { 
    grid: Grid, 
    onTileClick: (x: number, y: number) => void,
    onHover: (x: number, y: number) => void,
    onLeave: () => void,
    lensMode: LensMode 
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = GRID_SIZE * GRID_SIZE;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (!meshRef.current) return;
        let i = 0;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const [wx, _, wz] = gridToWorld(x, y);
                dummy.position.set(wx, -0.55, wz);
                dummy.scale.set(1, 0.5, 1);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                i++;
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [dummy]);

    useEffect(() => {
        if (!meshRef.current) return;
        const colors = new Float32Array(count * 3);
        let dataMap: Float32Array | null = null;
        if (lensMode === LensMode.LandValue) dataMap = computeLandValueMap(grid);
        if (lensMode === LensMode.Population) dataMap = computePopulationMap(grid);

        let i = 0;
        const tempColor = new THREE.Color();
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = grid[y][x];
                const type = tile.buildingType;
                
                if (lensMode === LensMode.None) {
                    const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
                    
                    if (type === BuildingType.None) {
                        const hex = noise > 0.7 ? '#22c55e' : noise > 0.3 ? '#4ade80' : '#86efac';
                        tempColor.set(hex);
                    } else if (type === BuildingType.Road) {
                         // Neighbor check for road styling
                         let hasInd = false;
                         let hasRes = false;
                         // Check 4 neighbors
                         const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
                         for(const [dx, dy] of dirs) {
                             const nx = x + dx, ny = y + dy;
                             if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                 const nt = grid[ny][nx].buildingType;
                                 if(nt === BuildingType.Industrial) hasInd = true;
                                 if(nt === BuildingType.Residential) hasRes = true;
                             }
                         }

                         if (hasInd) tempColor.set('#4b5563'); // Darker Industrial Road
                         else if (hasRes) tempColor.set('#9ca3af'); // Lighter Residential Street
                         else tempColor.set('#334155'); // Standard Highway
                    } else {
                        tempColor.set('#d1d5db');
                    }
                } else {
                    const val = dataMap ? dataMap[i] : 0;
                    if (lensMode === LensMode.LandValue) tempColor.setHSL(0.33, 1, 0.1 + val * 0.6);
                    else if (lensMode === LensMode.Population) val > 0 ? tempColor.setHSL(0.6 - val * 0.6, 0.8, 0.5) : tempColor.set('#e2e8f0');
                    else if (lensMode === LensMode.Services) {
                         tempColor.set('#94a3b8');
                    }
                    if (type === BuildingType.Road) tempColor.multiplyScalar(0.5);
                }
                
                colors[i*3] = tempColor.r;
                colors[i*3+1] = tempColor.g;
                colors[i*3+2] = tempColor.b;
                i++;
            }
        }
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor.needsUpdate = true;
    }, [grid, count, lensMode]);

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[boxGeo, undefined, count]} 
            receiveShadow 
            castShadow
            onPointerMove={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) onHover(e.instanceId % GRID_SIZE, Math.floor(e.instanceId / GRID_SIZE));
            }}
            onPointerOut={() => onLeave()}
            onClick={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && e.button === 0) onTileClick(e.instanceId % GRID_SIZE, Math.floor(e.instanceId / GRID_SIZE));
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
  lensMode: LensMode;
  settings?: AppSettings; 
  onCitizenClick: (c: Citizen) => void;
}

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, population, celebrate = false, lensMode, settings, onCitizenClick }) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const handleHover = useCallback((x: number, y: number) => setHoveredTile({ x, y }), []);
  const handleLeave = useCallback(() => setHoveredTile(null), []);

  const showPreview = hoveredTile && grid[hoveredTile.y][hoveredTile.x].buildingType === BuildingType.None && hoveredTool !== BuildingType.None;
  const previewColor = showPreview ? BUILDINGS[hoveredTool].color : 'white';
  const isBulldoze = hoveredTool === BuildingType.None;
  const previewPos = hoveredTile ? gridToWorld(hoveredTile.x, hoveredTile.y) : [0,0,0];
  const shadowsEnabled = !settings?.lowGraphics;
  const shadowMapSize = settings?.shadowDetail === 'high' ? 4096 : (settings?.shadowDetail === 'medium' ? 2048 : 1024);
  const isNight = settings?.isNight ?? false;

  return (
    <div className={`absolute inset-0 touch-none transition-colors duration-1000 ${isNight ? 'bg-slate-900' : 'bg-sky-400'}`}>
      <Canvas shadows={shadowsEnabled} dpr={settings?.lowGraphics ? 0.75 : [1, 1.5]} gl={{ antialias: !settings?.lowGraphics }}>
        <OrthographicCamera makeDefault zoom={20} position={[50, 50, 50]} near={-200} far={1000} />
        <MapControls enableRotate={true} enableZoom={true} minZoom={5} maxZoom={100} maxPolarAngle={Math.PI / 2.2} minPolarAngle={0.1} target={[0,-0.5,0]} />

        <ambientLight intensity={isNight ? 0.1 : 0.6} color={isNight ? "#1e293b" : "#cceeff"} />
        <directionalLight
          castShadow={shadowsEnabled}
          position={[30, 50, 20]}
          intensity={isNight ? 0.2 : 1.8}
          color={isNight ? "#3b82f6" : "#fffbeb"}
          shadow-mapSize={[shadowMapSize, shadowMapSize]}
          shadow-camera-left={-80} shadow-camera-right={80}
          shadow-camera-top={80} shadow-camera-bottom={-80}
        />
        {!isNight && <Environment preset="park" />}

        <WeatherSystem type={settings?.weather || 'sunny'} />

        <group>
          <GroundSystem grid={grid} onTileClick={onTileClick} onHover={handleHover} onLeave={handleLeave} lensMode={lensMode} />
          <RoadDetails grid={grid} isNight={isNight} />
          
          {grid.map((row, y) =>
            row.map((tile, x) => {
              if (tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road) {
                  const [wx, _, wz] = gridToWorld(x, y);
                  return (
                    <group key={`${x}-${y}`} position={[wx, 0, wz]} raycast={() => null}>
                      <ProceduralBuilding 
                        type={tile.buildingType} 
                        baseColor={BUILDINGS[tile.buildingType].color} 
                        x={x} y={y} 
                        level={tile.level}
                        isNight={isNight}
                      />
                    </group>
                  )
              }
              return null;
            })
          )}

          <group raycast={() => null}>
             <PopulationSystem grid={grid} population={population} onCitizenClick={onCitizenClick} />

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
              <Cursor x={hoveredTile.x} y={hoveredTile.y} color={isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#000000')} />
            )}
          </group>
        </group>
      </Canvas>
    </div>
  );
};

export default IsoMap;
